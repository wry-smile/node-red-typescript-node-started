/* eslint-disable no-console */
import type { Options } from 'tsup'
import { relative, resolve } from 'node:path'
import process from 'node:process'
import chokidar from 'chokidar'
import { build } from 'tsup'
import { filterPackageByConfig } from './config'
import { getFinalConfig } from './load-config'
import { NodeRedLauncher } from './node-red-launcher'
import { checkCustomBuild, singleBuild } from './single-build'
import { repoRoot } from './utils'

type PackageBuildOptionType = {
  type: 'custom'
  path: string
} | {
  type: 'default'
  config: Options
}

async function generatePackageBuildOptionsMapping() {
  const userConfig = await getFinalConfig()

  const roots = filterPackageByConfig(userConfig)

  const mapping = new Map<string, PackageBuildOptionType>()

  for (const buildOption of roots) {
    const { configPath, exists } = checkCustomBuild(buildOption)
    if (exists) {
      mapping.set(buildOption.scope, { type: 'custom', path: configPath! })
      continue
    }

    const buildOptions = singleBuild(buildOption, userConfig)

    mapping.set(buildOption.scope, { type: 'default', config: buildOptions })
  }
  return mapping
}

/**
 * Extract scope (package name) from file path
 * e.g. /repo/src/nodes/my-node/index.ts -> my-node
 */
function extractScopeFromFilePath(filePath: string): string | null {
  const relativePath = relative(repoRoot, filePath)
  const parts = relativePath.split('/')

  // Check if under nodes or plugins directory
  if (parts.length >= 3 && (parts[1] === 'nodes' || parts[1] === 'plugins')) {
    // parts[0] = 'src', parts[1] = 'nodes'|'plugins', parts[2] = scope
    return parts[2]
  }

  return null
}

async function buildByMapping(optionMapping: PackageBuildOptionType) {
  if (optionMapping?.type === 'default') {
    await build(optionMapping.config)
  }
  else {
    await build({ config: optionMapping?.path })
  }
}

async function buildPackage(
  buildOptionsMapping: Map<string, PackageBuildOptionType>,
  changeScopes: string[] = [],
) {
  if (changeScopes.length <= 0) {
    for (const [, mapping] of Array.from(buildOptionsMapping.entries())) {
      await buildByMapping(mapping)
    }

    return
  }

  for (const scope of changeScopes) {
    if (!buildOptionsMapping.has(scope))
      continue

    const mapping = buildOptionsMapping.get(scope)!

    await buildByMapping(mapping)
  }
}

async function run() {
  const buildOptionsMapping = await generatePackageBuildOptionsMapping()

  const redLauncher = NodeRedLauncher.getInstance()

  // Initial full build
  console.log('🔨 Building all packages...')
  await buildPackage(buildOptionsMapping)
  console.log('✅ Initial build completed\n')

  await redLauncher.start()

  const changedScopes = new Set<string>()
  let debounceTimer: NodeJS.Timeout | null = null
  let isWatcherReady = false

  const watchPaths = [
    resolve(repoRoot, './src/nodes'),
    resolve(repoRoot, './src/plugins'),
  ]

  console.log(`👀 Watching file changes: ${watchPaths.join(', ')}`)
  console.log('💡 Press Ctrl+C to stop watching\n')

  const scheduleBuild = () => {
    if (!isWatcherReady)
      return

    if (debounceTimer)
      clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      if (changedScopes.size > 0) {
        const scopesToBuild = Array.from(changedScopes)
        console.log(`🔨 Incremental build scopes: ${scopesToBuild.join(', ')}`)
        try {
          await buildPackage(buildOptionsMapping, scopesToBuild)
          console.log(`✅ Incremental build completed\n`)

          // Restart Node-RED after a successful build
          try {
            if (redLauncher.isRunning()) {
              await redLauncher.restart()
            }
            else {
              await redLauncher.start()
            }
            console.log('🔁 Node-RED restarted')
          }
          catch (err) {
            console.error('❌ Failed to restart Node-RED:', err)
          }
        }
        catch (error) {
          console.error(`❌ Build failed:`, error)
        }
        changedScopes.clear()
      }
      debounceTimer = null
    }, 500)
  }

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(node_modules|\.git|dist|\.d\.ts|\.map)$/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100,
    },
  })
    .on('ready', () => {
      isWatcherReady = true
      console.log('✅ File watcher is ready')
    })
    .on('change', (filePath) => {
      const scope = extractScopeFromFilePath(filePath)
      if (scope) {
        changedScopes.add(scope)
        console.log(`📝 File changed: ${relative(repoRoot, filePath)} (scope: ${scope})`)
      }
      scheduleBuild()
    })
    .on('add', (filePath) => {
      const scope = extractScopeFromFilePath(filePath)
      if (scope) {
        changedScopes.add(scope)
        console.log(`✨ File added: ${relative(repoRoot, filePath)} (scope: ${scope})`)
      }
      scheduleBuild()
    })
    .on('unlink', (filePath) => {
      const scope = extractScopeFromFilePath(filePath)
      if (scope) {
        changedScopes.add(scope)
        console.log(`🗑️ File removed: ${relative(repoRoot, filePath)} (scope: ${scope})`)
      }
      scheduleBuild()
    })
    .on('error', (error) => {
      console.error('❌ Watch error:', error)
    })

  // Handle process signals and graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`\n⏹️ Received ${signal}, shutting down watcher...`)

    // Clear debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Close watcher
    await watcher.close()
    console.log('✅ Watcher closed')

    // Stop Node-RED
    try {
      await redLauncher.cleanup()
      console.log('✅ Node-RED stopped')
    }
    catch (err) {
      console.error('❌ Failed to stop Node-RED:', err)
    }

    process.exit(0)
  }

  process.on('SIGINT', () => handleShutdown('SIGINT'))
  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
}

run().catch((error) => {
  console.error('❌ Failed to start:', error)
  process.exit(1)
})
