import type { InlineConfig } from 'vite'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { build as viteBuild } from 'vite'
import { detectParts, findRuntimeConfig, pathExists, pkgNameFromPath } from './utils'

export interface RuntimeBuildOptions {
  pkgDir: string
  kind: 'nodes' | 'plugins'
  outBaseDir: string // 绝对路径：<repoRoot>/dist/nodes 或 dist/plugins
}

export async function buildRuntime(opts: RuntimeBuildOptions) {
  const { pkgDir, kind, outBaseDir } = opts
  const name = pkgNameFromPath(pkgDir)
  const pkgOutDir = path.join(outBaseDir, name)
  const runtimeOutDir = path.join(pkgOutDir, 'runtime')

  const { hasRuntime } = await detectParts(pkgDir)
  if (!hasRuntime)
    return { skipped: true as const, reason: 'no-runtime' }

  const customConfig = await findRuntimeConfig(pkgDir)
  if (customConfig) {
    const cfg: InlineConfig = {
      configFile: customConfig,
      root: pkgDir,
      build: {
        outDir: runtimeOutDir,
        emptyOutDir: true,
      },
    }
    await viteBuild(cfg)

    // 将 runtime.js 重命名为 packageName.js
    const sourceJs = path.join(runtimeOutDir, 'runtime.js')
    const targetJs = path.join(runtimeOutDir, `${name}.js`)
    if (await pathExists(sourceJs)) {
      await fs.rename(sourceJs, targetJs)
    }

    const outFile = `runtime/${name}.js`
    return { skipped: false as const, kind, name, outDir: pkgOutDir, outFile, mode: 'custom' as const }
  }

  // 默认：CJS 库打包
  const outFile = `${name}.js`
  const cfg: InlineConfig = {
    root: pkgDir,
    build: {
      outDir: runtimeOutDir,
      emptyOutDir: true,
      lib: {
        entry: path.join(pkgDir, 'runtime', 'index.ts'),
        formats: ['cjs'],
        fileName: () => outFile,
      },
      rollupOptions: {
        external: ['node-red'],
        output: {
          exports: 'default',
        },
      },
      target: 'node18',
      minify: false,
      sourcemap: false,
    },
  }

  await viteBuild(cfg)

  // 将 runtime.js 重命名为 packageName.js
  const sourceJs = path.join(runtimeOutDir, `${outFile}`)
  const targetJs = path.join(runtimeOutDir, `${name}.js`)
  if (sourceJs !== targetJs && await pathExists(sourceJs)) {
    await fs.rename(sourceJs, targetJs)
  }

  const finalOutFile = `runtime/${name}.js`
  return { skipped: false as const, kind, name, outDir: pkgOutDir, outFile: finalOutFile, mode: 'default' as const }
}
