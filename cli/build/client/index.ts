import type { PluginOption, UserConfig } from 'vite'
import type { SingleFilePluginOptions, TailwindcssPluginOptions, VuePluginOptions } from '../types/plugin'
import type { CopyTask } from './plugins/copy-file.plugin'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { viteCopyTaskPlugin } from './plugins/copy-file.plugin'
import { viteSingleFile } from './plugins/single-file.plugin'

export interface ClientConfigOptions {
  scope: string
  copyTask?: CopyTask[]
  vuePlugin?: boolean | VuePluginOptions
  singleFilePlugin?: boolean | SingleFilePluginOptions
  tailwindcssPlugin?: boolean | TailwindcssPluginOptions
}

export function defineClientConfig(options: ClientConfigOptions): UserConfig {
  const {
    vuePlugin = true,
    singleFilePlugin = true,
    tailwindcssPlugin = true,
    copyTask = [],
  } = options

  const defaultCopyTask: CopyTask[] = [
    {
      from: resolve(cwd(), 'package.json'),
      to: resolve(cwd(), 'dist', 'package.json'),
    },
    {
      from: resolve(cwd(), 'public'),
      to: resolve(cwd(), 'dist', 'public'),
    },
    {
      from: resolve(cwd(), 'locales'),
      to: resolve(cwd(), 'dist', 'locales'),
    },
  ]

  const plugins: PluginOption[] = [
    viteCopyTaskPlugin({ tasks: [...defaultCopyTask, ...copyTask] }),
  ]

  if (vuePlugin) {
    plugins.push(vue(typeof vuePlugin === 'boolean' ? undefined : vuePlugin))
  }

  if (tailwindcssPlugin) {
    plugins.push(tailwindcss(typeof tailwindcssPlugin === 'boolean' ? undefined : tailwindcssPlugin))
  }

  if (singleFilePlugin) {
    plugins.push(viteSingleFile(
      {
        removeViteModuleLoader: true,
        ...(typeof singleFilePlugin === 'boolean' ? undefined : singleFilePlugin),
      },
    ))
  }

  return {
    plugins,
    build: {
      minify: false,
      emptyOutDir: false,
      outDir: 'dist',
      write: false,
      rollupOptions: {
        input: resolve(cwd(), 'client', 'editor.html'),
      },
    },
  }
}
