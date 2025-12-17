import type { Options } from 'tsup'

export type TsUpPlugin = Required<Options>['plugins'][number]

export interface PluginOptions {
  entryRoot: string
  outputRoot: string
  scope: string
}
