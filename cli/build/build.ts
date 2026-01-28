import type { Rollup } from 'vite'
import type { DefineConfigOptions } from './define-config'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { build, loadConfigFromFile } from 'vite'

function loadConfig(): Promise<{
  path: string
  config: DefineConfigOptions
  dependencies: string[]
} | null> {
  const configPath = resolve(cwd(), 'vite.config.ts')

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`)
  }

  return loadConfigFromFile({
    command: 'build',
    mode: 'production',
  }, configPath) as Promise<{
    path: string
    config: DefineConfigOptions
    dependencies: string[]
  } | null>
}

export async function buildEntry() {
  const config = await loadConfig()

  await build(config?.config.runtime)

  const clientConfig = config?.config.client

  if (!clientConfig) {
    throw new Error('Client config not found.')
  }

  const result = await build(clientConfig) as Rollup.RollupOutput

  const htmlAsset = result.output.find(
    (o): o is Rollup.OutputAsset => o.type === 'asset' && o.fileName.endsWith('.html'),
  )

  if (htmlAsset) {
    const scope = config.config.scope as string
    if (!scope) {
      throw new Error('Scope is not defined in the client configuration.')
    }
    const outPath = resolve(cwd(), 'dist', `${scope}.html`)
    await writeFile(outPath, htmlAsset.source)
  }
  else {
    console.warn('No HTML asset found in build output.')
  }
}
