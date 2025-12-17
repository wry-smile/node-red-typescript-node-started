import type { Options } from 'tsup'
import type { BuildConfig } from './config'
import type { PackageKind } from './utils'
import { resolve } from 'node:path'
import { build } from 'tsup'
import { clientBuildPlugin, copyFilesPlugin } from './plugins'
import { pathExists, pkgNameFromPath } from './utils'

export interface SingleBuildOptions {
  entryRoot: string
  kind: PackageKind
  scope: string
}

const NODE_CONFIG_FILES = [
  'tsup.config.mts',
  'tsup.config.ts',
  'tsup.config.mjs',
  'tsup.config.js',
  'tsup.config.cjs',
  'tsup.config.json',
]

export function singleBuild(options: SingleBuildOptions, userConfig: Required<BuildConfig>): Options {
  const { entryRoot, kind } = options

  const scope = pkgNameFromPath(entryRoot)

  const { output, outDir } = userConfig

  const isMerge = output?.type === 'merge'

  const outputRoot = isMerge ? resolve(outDir, kind, scope) : resolve(outDir, scope)

  const runtimeEntry = resolve(entryRoot, 'runtime', 'index.ts')

  return {
    name: 'runtime',
    entry: { [scope]: runtimeEntry },
    outDir: outputRoot,
    format: ['cjs'],
    splitting: true,
    cjsInterop: true,
    minify: true,
    clean: true,
    noExternal: [/.*/],
    plugins: [
      clientBuildPlugin({ entryRoot, scope, outputRoot }),
      copyFilesPlugin({
        files: [
          {
            src: resolve(entryRoot, 'package.json'),
            dest: resolve(outputRoot, 'package.json'),
          },
          {
            src: resolve(entryRoot, 'locales'),
            dest: resolve(outputRoot, 'locales'),
          },
          {
            src: resolve(entryRoot, 'public'),
            dest: resolve(outputRoot, 'public'),
          },
        ],
        entryRoot,
        outputRoot,
        scope,
      }),
    ],
  }
}

export function checkCustomBuild(options: SingleBuildOptions) {
  const { entryRoot } = options
  for (const f of NODE_CONFIG_FILES) {
    const p = resolve(entryRoot, f)
    if (pathExists(p))
      return { configPath: p, exists: true }
  }
  return { exists: false }
}

export async function singleCustomBuild(configPath: string, _options: SingleBuildOptions) {
  await build({
    config: configPath,
  })
}
