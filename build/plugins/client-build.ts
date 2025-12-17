import type { Rollup } from 'vite'
import type { PluginOptions, TsUpPlugin } from '../types'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { build } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export function clientBuildPlugin({ entryRoot, outputRoot, scope }: PluginOptions): TsUpPlugin {
  return {
    name: 'client-build-plugin',
    async buildEnd() {
      const clientRoot = join(entryRoot, 'client')
      const entryFile = join(clientRoot, 'editor.html')

      const result = await build({
        root: entryRoot,
        plugins: [
          vue({}),
          viteSingleFile({ removeViteModuleLoader: true }),
          tailwindcss(),
        ],
        build: {
          write: false,
          emptyOutDir: true,
          rollupOptions: {
            input: entryFile,
          },
        },
      }) as Rollup.RollupOutput

      const { output } = result

      const outputFileName = `${scope}.html`
      const writePath = join(outputRoot, outputFileName)

      for (const item of output) {
        if (item.type === 'asset') {
          if (item.fileName === 'client/editor.html') {
            writeFileSync(writePath, item.source, 'utf-8')
            return
          }
        }
      }
    },
  }
}
