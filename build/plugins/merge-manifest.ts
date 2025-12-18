import type { Recordable } from '@wry-smile/utils'
import type { BuildConfig } from '../config'
import type { PluginOptions, TsUpPlugin } from '../types'
import type { PackageKind } from '../utils'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readJSON } from '../utils'

export function mergeManifestPlugin(options: PluginOptions, userConfig: BuildConfig): TsUpPlugin {
  return {
    name: 'merge-manifest-plugin',
    buildEnd() {
      const { output, outDir = 'dist' } = userConfig
      const isMerge = output?.type === 'merge'
      if (!isMerge)
        return

      const { scope, kind } = options
      const { merge } = output || {}

      const existsRootPackageJson = existsSync(join(outDir, 'package.json'))

      const basePackage = existsRootPackageJson ? readJSON(join(outDir, 'package.json')) : merge?.rootPackage || {}

      mergeManifest(basePackage, kind, scope)

      writeFileSync(join(outDir, 'package.json'), JSON.stringify(basePackage, null, 2))
    },
  }
}

function mergeManifest(packageJSON: Recordable, kind: PackageKind, scope: string) {
  if (!packageJSON['node-red']) {
    packageJSON['node-red'] = {}
  }

  const nodeREDManifest = packageJSON['node-red']

  if (kind === 'nodes') {
    if (!nodeREDManifest.nodes)
      nodeREDManifest.nodes = {}

    Object.assign(nodeREDManifest.nodes, { [scope]: `${kind}/${scope}/${scope}.js` })
  }
  else {
    if (!nodeREDManifest.plugins)
      nodeREDManifest.plugins = {}
    Object.assign(nodeREDManifest.plugins, { [scope]: `${kind}/${scope}/${scope}.js` })
  }

  return nodeREDManifest
}
