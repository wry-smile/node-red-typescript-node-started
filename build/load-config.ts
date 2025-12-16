/* eslint-disable no-console */
import type { BuildConfig } from './config'
import path from 'node:path'
import { mergeConfig } from './config'
import { pathExists, repoRoot } from './utils'

const CONFIG_CANDIDATES = [
  'build.config.ts',
  'build.config.js',
  'build.config.mjs',
]

async function importConfigFile(filePath: string): Promise<BuildConfig | null> {
  try {
    const module = await import(filePath)
    const config = module.default || module.config

    if (!config) {
      console.warn(`⚠️  配置文件 ${path.basename(filePath)} 未导出默认值或 config 对象`)
      return null
    }

    return config as BuildConfig
  }
  catch (e) {
    console.error(`❌ 加载配置文件失败: ${filePath}`)
    console.error(e)
    return null
  }
}

export async function loadBuildConfig(): Promise<BuildConfig | null> {
  for (const candidate of CONFIG_CANDIDATES) {
    const configPath = path.join(repoRoot, candidate)

    if (await pathExists(configPath)) {
      console.log(`📋 找到配置文件: ${candidate}`)

      // 对于 .ts 文件，需要通过 tsx 或 esbuild 加载
      if (candidate.endsWith('.ts')) {
        // 尝试使用 tsx 的 register 或直接 import
        try {
          // 使用 file:// URL 协议确保正确的模块解析
          const fileUrl = `file://${configPath}`
          const module = await import(fileUrl)
          const config = module.default || module.config

          if (config) {
            console.log(`✅ 成功加载配置文件: ${candidate}`)
            return config as BuildConfig
          }
        }
        catch {
          console.warn(`⚠️  无法直接加载 TypeScript 配置文件，请使用 .js 或 .mjs 格式`)
          console.warn(`   或确保环境已配置 tsx/ts-node`)
        }
      }
      else {
        // .js 或 .mjs 文件
        const config = await importConfigFile(configPath)
        if (config) {
          console.log(`✅ 成功加载配置文件: ${candidate}`)
          return config
        }
      }
    }
  }

  console.log(`ℹ️  未找到配置文件，使用默认配置`)
  return null
}

export async function getFinalConfig(): Promise<ReturnType<typeof mergeConfig>> {
  const userConfig = await loadBuildConfig()
  return mergeConfig(userConfig ?? undefined)
}
