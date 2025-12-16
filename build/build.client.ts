import type { InlineConfig } from 'vite'
import { promises as fs } from 'node:fs'
import path, { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { build as viteBuild } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { detectParts, findClientConfig, pkgNameFromPath } from './utils'

export interface ClientBuildOptions {
  pkgDir: string
  kind: 'nodes' | 'plugins'
  outBaseDir: string // 绝对路径：<repoRoot>/dist/nodes 或 dist/plugins
}

export async function buildClient(opts: ClientBuildOptions) {
  const { pkgDir, kind, outBaseDir } = opts
  const name = pkgNameFromPath(pkgDir)
  const pkgOutDir = path.join(outBaseDir, name)
  const clientOutDir = path.join(pkgOutDir, 'client')

  const { hasClient } = await detectParts(pkgDir)
  if (!hasClient)
    return { skipped: true as const, reason: 'no-client' }

  const customConfig = await findClientConfig(pkgDir)
  if (customConfig) {
    const cfg: InlineConfig = {
      configFile: customConfig,
      build: {
        outDir: clientOutDir,
        emptyOutDir: true,
      },
    }
    await viteBuild(cfg)

    const outFile = `client/${name}.html`
    return { skipped: false as const, kind, name, outDir: pkgOutDir, outFile, mode: 'custom' as const }
  }

  const clientRoot = path.join(pkgDir, 'client')
  const cfg: InlineConfig = {
    root: clientRoot,
    plugins: [
      vue({}),
      viteSingleFile({ removeViteModuleLoader: true }),
      tailwindcss(),
    ],
    build: {
      outDir: clientOutDir,
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(clientRoot, 'editor.html'),
      },
    },
  }

  await viteBuild(cfg)

  const outFile = `client/${name}.html`
  return { skipped: false as const, kind, name, outDir: pkgOutDir, outFile, mode: 'default' as const }
}
