/* eslint-disable no-console */
import type { ChildProcess } from 'node:child_process'
import { exec, spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/**
 * Node-RED launcher status
 */
export enum LauncherStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  ERROR = 'error',
}

/**
 * Node-RED launcher configuration
 */
export interface LauncherConfig {
  port?: number
  userDir?: string
  settings?: string
  verbose?: boolean
  safe?: boolean
  customArgs?: string[]
}

/**
 * Node-RED launcher (Singleton)
 * Responsible for dependency checking, start/stop/restart of a Node-RED instance
 */
export class NodeRedLauncher {
  private static instance: NodeRedLauncher
  private process: ChildProcess | null = null
  private status: LauncherStatus = LauncherStatus.STOPPED
  private config: LauncherConfig = {}
  private nodeRedPath: string | null = null
  private restartAttempts: number = 0
  private maxRestartAttempts: number = 3

  /**
   * Private constructor to enforce singleton
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): NodeRedLauncher {
    if (!NodeRedLauncher.instance) {
      NodeRedLauncher.instance = new NodeRedLauncher()
    }
    return NodeRedLauncher.instance
  }

  /**
   * Check whether Node-RED is installed (global or local)
   */
  public async checkDependencies(): Promise<{
    installed: boolean
    path?: string
    version?: string
    location: 'global' | 'local' | 'none'
  }> {
    try {
      // Prefer global install
      const globalCheck = await this.checkGlobalNodeRed()
      if (globalCheck.installed) {
        this.nodeRedPath = globalCheck.path!
        return globalCheck
      }

      // Fallback to local install
      const localCheck = await this.checkLocalNodeRed()
      if (localCheck.installed) {
        this.nodeRedPath = localCheck.path!
        return localCheck
      }

      return {
        installed: false,
        location: 'none',
      }
    }
    catch (error) {
      console.error('Error while checking dependencies:', error)
      return {
        installed: false,
        location: 'none',
      }
    }
  }

  /**
   * Check global Node-RED
   */
  private async checkGlobalNodeRed(): Promise<{
    installed: boolean
    path?: string
    version?: string
    location: 'global' | 'local' | 'none'
  }> {
    try {
      const { stdout } = await execAsync('node-red --version')
      const version = stdout.trim()

      // Resolve absolute command path
      const isWindows = process.platform === 'win32'
      const whichCmd = isWindows ? 'where node-red' : 'which node-red'
      const { stdout: pathOutput } = await execAsync(whichCmd)
      const noderedPath = pathOutput.trim().split('\n')[0]

      return {
        installed: true,
        path: noderedPath,
        version,
        location: 'global',
      }
    }
    catch {
      return {
        installed: false,
        location: 'none',
      }
    }
  }

  /**
   * Check local Node-RED (node_modules)
   */
  private async checkLocalNodeRed(): Promise<{
    installed: boolean
    path?: string
    version?: string
    location: 'global' | 'local' | 'none'
  }> {
    try {
      const localPaths = [
        path.join(process.cwd(), 'node_modules', '.bin', 'node-red'),
        path.join(process.cwd(), 'node_modules', 'node-red', 'red.js'),
      ]

      for (const localPath of localPaths) {
        if (fs.existsSync(localPath)) {
          // Try to obtain version
          try {
            const { stdout } = await execAsync(`"${localPath}" --version`)
            return {
              installed: true,
              path: localPath,
              version: stdout.trim(),
              location: 'local',
            }
          }
          catch {
            return {
              installed: true,
              path: localPath,
              location: 'local',
            }
          }
        }
      }

      return {
        installed: false,
        location: 'none',
      }
    }
    catch {
      return {
        installed: false,
        location: 'none',
      }
    }
  }

  /**
   * Start Node-RED
   */
  public async start(config: LauncherConfig = {}): Promise<void> {
    if (this.status === LauncherStatus.RUNNING) {
      throw new Error('Node-RED is already running')
    }

    if (this.status === LauncherStatus.STARTING) {
      throw new Error('Node-RED is starting')
    }

    this.config = { ...this.config, ...config }
    this.status = LauncherStatus.STARTING

    try {
      // Dependencies check
      const deps = await this.checkDependencies()
      if (!deps.installed) {
        this.status = LauncherStatus.ERROR
        throw new Error('Node-RED is not installed. Please install it first: npm install -g node-red')
      }

      console.log(`Found Node-RED: ${deps.location} install (${deps.version || 'unknown version'})`)
      console.log(`Path: ${deps.path}`)

      // Build start args
      const args = this.buildStartArgs()

      // Spawn process
      const command = this.nodeRedPath || 'node-red'
      console.log(`Start command: ${command} ${args.join(' ')}`)

      this.process = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      })

      // stdout
      this.process.stdout?.on('data', (data) => {
        const output = data.toString()
        console.log(`[Node-RED] ${output}`)

        // Detect running state
        if (output.includes('Server now running') || output.includes('Started flows')) {
          this.status = LauncherStatus.RUNNING
          this.restartAttempts = 0
          console.log('✓ Node-RED started')
        }
      })

      // stderr
      this.process.stderr?.on('data', (data) => {
        console.error(`[Node-RED Error] ${data.toString()}`)
      })

      // exit
      this.process.on('exit', (code, signal) => {
        console.log(`Node-RED process exited (code: ${code}, signal: ${signal})`)
        this.process = null

        if (this.status === LauncherStatus.RUNNING || this.status === LauncherStatus.STARTING) {
          this.status = LauncherStatus.ERROR
          console.error('Node-RED exited unexpectedly')
        }
        else {
          this.status = LauncherStatus.STOPPED
        }
      })

      // error
      this.process.on('error', (error) => {
        console.error('Error starting Node-RED:', error)
        this.status = LauncherStatus.ERROR
        this.process = null
      })

      // wait until started or timeout
      await this.waitForStartup()
    }
    catch (error) {
      this.status = LauncherStatus.ERROR
      throw error
    }
  }

  /**
   * Stop Node-RED
   */
  public async stop(): Promise<void> {
    if (this.status === LauncherStatus.STOPPED) {
      console.log('Node-RED is already stopped')
      return
    }

    if (this.status === LauncherStatus.STOPPING) {
      throw new Error('Node-RED is stopping')
    }

    if (!this.process) {
      this.status = LauncherStatus.STOPPED
      return
    }

    this.status = LauncherStatus.STOPPING
    console.log('Stopping Node-RED...')

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.process) {
          console.log('Force killing Node-RED process')
          this.process.kill('SIGKILL')
        }
        this.status = LauncherStatus.STOPPED
        this.process = null
        resolve()
      }, 10000) // 10s timeout

      this.process!.once('exit', () => {
        clearTimeout(timeout)
        this.status = LauncherStatus.STOPPED
        this.process = null
        console.log('✓ Node-RED stopped')
        resolve()
      })

      // graceful signal first
      this.process!.kill('SIGTERM')
    })
  }

  /**
   * Restart Node-RED
   */
  public async restart(config?: LauncherConfig): Promise<void> {
    console.log('Restarting Node-RED...')

    if (this.restartAttempts >= this.maxRestartAttempts) {
      throw new Error(`Too many restart attempts (${this.restartAttempts}/${this.maxRestartAttempts})`)
    }

    this.restartAttempts++

    try {
      if (this.status !== LauncherStatus.STOPPED) {
        await this.stop()
      }

      // ensure the port is released
      await new Promise(resolve => setTimeout(resolve, 2000))

      await this.start(config)
      this.restartAttempts = 0
      console.log('✓ Node-RED restarted')
    }
    catch (error) {
      console.error('Failed to restart Node-RED:', error)
      throw error
    }
  }

  /**
   * Get current status
   */
  public getStatus(): LauncherStatus {
    return this.status
  }

  /**
   * Whether Node-RED is running
   */
  public isRunning(): boolean {
    return this.status === LauncherStatus.RUNNING
  }

  /**
   * Get current configuration
   */
  public getConfig(): LauncherConfig {
    return { ...this.config }
  }

  /**
   * Get process PID
   */
  public getPid(): number | undefined {
    return this.process?.pid
  }

  /**
   * Build start arguments
   */
  private buildStartArgs(): string[] {
    const args: string[] = []

    if (this.config.port) {
      args.push('--port', this.config.port.toString())
    }

    if (this.config.userDir) {
      args.push('--userDir', this.config.userDir)
    }

    if (this.config.settings) {
      args.push('--settings', this.config.settings)
    }

    if (this.config.verbose) {
      args.push('--verbose')
    }

    if (this.config.safe) {
      args.push('--safe')
    }

    if (this.config.customArgs) {
      args.push(...this.config.customArgs)
    }

    return args
  }

  /**
   * Wait until started or timeout
   */
  private async waitForStartup(timeout: number = 30000): Promise<void> {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.status === LauncherStatus.RUNNING) {
          clearInterval(checkInterval)
          resolve()
        }
        else if (this.status === LauncherStatus.ERROR) {
          clearInterval(checkInterval)
          reject(new Error('Node-RED failed to start'))
        }
        else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          this.status = LauncherStatus.ERROR
          reject(new Error('Node-RED start timeout'))
        }
      }, 500)
    })
  }

  /**
   * Cleanup if needed
   */
  public async cleanup(): Promise<void> {
    if (this.status !== LauncherStatus.STOPPED) {
      await this.stop()
    }
  }
}

// Default export: singleton instance
export default NodeRedLauncher.getInstance()
