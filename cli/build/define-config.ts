import type { UserConfig } from 'vite'
import type { CopyTask } from './client/plugins/copy-file.plugin'
import type { SingleFilePluginOptions, TailwindcssPluginOptions, VuePluginOptions } from './types/plugin'
import { mergeConfig } from 'vite'
import { defineClientConfig } from './client'
import { defineRuntimeConfig } from './runtime'

export interface DefineConfigOptions {
  runtime?: UserConfig
  client?: UserConfig
  scope: string
  vuePlugin?: boolean | VuePluginOptions
  singleFilePlugin?: boolean | SingleFilePluginOptions
  tailwindcssPlugin?: boolean | TailwindcssPluginOptions
  copyTask?: CopyTask[]
}

export function defineConfig(config: DefineConfigOptions): Required<DefineConfigOptions> {
  const {
    runtime = {},
    client = {},
    scope,
    vuePlugin = true,
    singleFilePlugin = true,
    tailwindcssPlugin = true,
    copyTask = [],
  } = config ?? {}

  return {
    scope,
    vuePlugin,
    singleFilePlugin,
    tailwindcssPlugin,
    copyTask,
    runtime: mergeConfig(
      defineRuntimeConfig({
        scope,
      }),
      runtime,
    ),
    client: mergeConfig(
      defineClientConfig({
        scope,
        copyTask,
      }),
      client,
    ),
  }
}
