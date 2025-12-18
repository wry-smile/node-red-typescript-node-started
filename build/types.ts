import type { Options } from 'tsup'
import type { PackageKind } from './utils'

export type TsUpPlugin = Required<Options>['plugins'][number]

export interface PluginOptions {
  entryRoot: string
  outputRoot: string
  scope: string
  kind: PackageKind
}
