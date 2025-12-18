/* eslint-disable no-console */
import type { BuildConfig } from './config'
import path from 'node:path'
import { mergeConfig } from './config'
import { pathExists, repoRoot } from './utils'

const CONFIG_CANDIDATES = [
  'build.config.ts',
  'build.config.mts',
  'build.config.js',
  'build.config.mjs',
]

async function importConfigFile(filePath: string): Promise<BuildConfig | null> {
  try {
    const module = await import(filePath)
    const config = module.default || module.config

    if (!config) {
      console.warn(`Config file ${path.basename(filePath)} did not export default value or config object`)
      return null
    }

    return config as BuildConfig
  }
  catch (e) {
    console.error(`Load configuration file failed: ${filePath}`)
    console.error(e)
    return null
  }
}

export async function loadBuildConfig(): Promise<BuildConfig | null> {
  for (const candidate of CONFIG_CANDIDATES) {
    const configPath = path.join(repoRoot, candidate)

    if (pathExists(configPath)) {
      console.log(`Found configuration file: ${candidate}`)

      if (candidate.endsWith('.ts')) {
        try {
          const fileUrl = `file://${configPath}`
          const module = await import(fileUrl)
          const config = module.default || module.config

          if (config) {
            console.log(`Loaded configuration file: ${candidate}`)
            return config as BuildConfig
          }
        }
        catch {
          console.warn(`Cannot directly load TypeScript configuration file, please use .js or .mjs format`)
        }
      }
      else {
        // .js or .mjs file
        const config = await importConfigFile(configPath)
        if (config) {
          console.log(`Loaded configuration file: ${candidate}`)
          return config
        }
      }
    }
  }

  console.log(`Configuration file not found, using default configuration`)
  return null
}

export async function getFinalConfig(): Promise<ReturnType<typeof mergeConfig>> {
  const userConfig = await loadBuildConfig()
  return mergeConfig(userConfig ?? undefined)
}
