/* eslint-disable no-console */
import type { Options } from 'tsup'
import { relative, resolve } from 'node:path'
import process from 'node:process'
import chokidar from 'chokidar'
import { build } from 'tsup'
import { filterPackageByConfig } from './config'
import { getFinalConfig } from './load-config'
import { checkCustomBuild, singleBuild } from './single-build'
import { repoRoot } from './utils'

type PackageBuildOptionType = {
  type: 'custom'
  path: string
} | {
  type: 'default'
  config: Options
}

async function generatePackageBuildOptionsMapping() {
  const userConfig = await getFinalConfig()

  const roots = filterPackageByConfig(userConfig)

  const mapping = new Map<string, PackageBuildOptionType>()

  for (const buildOption of roots) {
    const { configPath, exists } = checkCustomBuild(buildOption)
    if (exists) {
      mapping.set(buildOption.scope, { type: 'custom', path: configPath! })
      continue
    }

    const buildOptions = singleBuild(buildOption, userConfig)

    mapping.set(buildOption.scope, { type: 'default', config: buildOptions })
  }
  return mapping
}

/**
 * 从文件路径提取对应的 scope（包名）
 * 例如: /repo/src/nodes/my-node/index.ts -> my-node
 */
function extractScopeFromFilePath(filePath: string): string | null {
  const relativePath = relative(repoRoot, filePath)
  const parts = relativePath.split('/')

  // 检查是否在 nodes 或 plugins 目录下
  if (parts.length >= 3 && (parts[1] === 'nodes' || parts[1] === 'plugins')) {
    // parts[0] = 'src', parts[1] = 'nodes'|'plugins', parts[2] = scope
    return parts[2]
  }

  return null
}

async function buildByMapping(optionMapping: PackageBuildOptionType) {
  if (optionMapping?.type === 'default') {
    await build(optionMapping.config)
  }
  else {
    await build({ config: optionMapping?.path })
  }
}

async function buildPackage(
  buildOptionsMapping: Map<string, PackageBuildOptionType>,
  changeScopes: string[] = [],
) {
  if (changeScopes.length <= 0) {
    for (const [, mapping] of Array.from(buildOptionsMapping.entries())) {
      buildByMapping(mapping)
    }

    return
  }

  for (const scope of changeScopes) {
    if (!buildOptionsMapping.has(scope))
      continue

    const mapping = buildOptionsMapping.get(scope)!

    await buildByMapping(mapping)
  }
}

async function run() {
  const buildOptionsMapping = await generatePackageBuildOptionsMapping()

  // 初始全量构建
  console.log('🔨 初始化构建所有包...')
  await buildPackage(buildOptionsMapping)
  console.log('✅ 初始化构建完成\n')

  // 用于去重和防抖的变量
  const changedScopes = new Set<string>()
  let debounceTimer: NodeJS.Timeout | null = null

  const watchPaths = [
    resolve(repoRoot, './src/nodes'),
    resolve(repoRoot, './src/plugins'),
  ]

  console.log(`👀 开始监听文件变化: ${watchPaths.join(', ')}`)
  console.log('💡 按 Ctrl+C 停止监听\n')

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(node_modules|\.git|dist|\.d\.ts|\.map)$/,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100,
    },
  })
    .on('change', (filePath) => {
      const scope = extractScopeFromFilePath(filePath)
      if (scope) {
        changedScopes.add(scope)
        console.log(`📝 文件变化: ${relative(repoRoot, filePath)} (scope: ${scope})`)
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(async () => {
        if (changedScopes.size > 0) {
          const scopesToBuild = Array.from(changedScopes)
          console.log(`🔨 增量构建 scope: ${scopesToBuild.join(', ')}`)
          try {
            await buildPackage(buildOptionsMapping, scopesToBuild)
            console.log(`✅ 增量构建完成\n`)
          }
          catch (error) {
            console.error(`❌ 构建失败:`, error)
          }
          changedScopes.clear()
        }
        debounceTimer = null
      }, 500)
    })
    .on('add', (filePath) => {
      const scope = extractScopeFromFilePath(filePath)
      if (scope) {
        changedScopes.add(scope)
        console.log(`✨ 新增文件: ${relative(repoRoot, filePath)} (scope: ${scope})`)
      }
    })
    .on('unlink', (filePath) => {
      const scope = extractScopeFromFilePath(filePath)
      if (scope) {
        changedScopes.add(scope)
        console.log(`🗑️ 删除文件: ${relative(repoRoot, filePath)} (scope: ${scope})`)
      }
    })
    .on('error', (error) => {
      console.error('❌ 监听错误:', error)
    })

  // 处理进程信号，优雅关闭
  const handleShutdown = async (signal: string) => {
    console.log(`\n⏹️ 收到 ${signal} 信号，正在关闭监听...`)

    // 清理防抖计时器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // 关闭监听器
    await watcher.close()
    console.log('✅ 监听已关闭')
    process.exit(0)
  }

  process.on('SIGINT', () => handleShutdown('SIGINT'))
  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
}

run().catch((error) => {
  console.error('❌ 启动失败:', error)
  process.exit(1)
})
