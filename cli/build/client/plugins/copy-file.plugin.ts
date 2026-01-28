import type { Plugin } from 'vite'
import { existsSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface CopyTask {
  /**
   * The source path to copy from.
   */
  from: string
  /**
   * The destination path to copy to.
   */
  to: string
}

export interface CopyPluginOptions {
  /**
   * An array of copy tasks to perform.
   */
  tasks: CopyTask[]
}

/**
 * A Vite plugin to copy files and directories, similar to tsdown's copy functionality.
 * @param options - The copy plugin options.
 */
export function viteCopyTaskPlugin(options: CopyPluginOptions): Plugin {
  const { tasks } = options

  return {
    name: 'vite-plugin-copy-task',
    // We use buildStart to ensure files are copied before the build process needs them.
    async buildStart() {
      if (!tasks || tasks.length === 0) {
        this.warn('No copy tasks provided.')
        return
      }

      this.info(`Starting ${tasks.length} copy task(s)...`)

      for (const task of tasks) {
        const source = resolve(task.from)
        const destination = resolve(task.to)

        if (!existsSync(task.from)) {
          continue
        }

        try {
          await cp(source, destination, { recursive: true, force: true })
          this.info(`Copied: ${source} -> ${destination}`)
        }
        catch (error) {
          this.error(`Failed to copy: ${source} -> ${destination}. Error: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    },
  }
}
