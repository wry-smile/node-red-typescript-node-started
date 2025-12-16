/* eslint-disable no-console */
import type { FSWatcher } from 'chokidar'
import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import chokidar from 'chokidar'
import { buildClient } from './build.client'
import { finalizePackage, flattenDist, writeRootNodeRedManifest } from './build.end'
import { buildRuntime } from './build.runtime'
import { getFinalConfig } from './load-config'
import { listSubDirs, pkgNameFromPath, repoRoot } from './utils'

// 全局状态
let isBuilding = false
let pendingRebuild = false
let watcher: FSWatcher | null = null
let nodeRedProcess: ChildProcess | null = null
let isRestarting = false

async function scanKindDirs(kind: 'nodes' | 'plugins') {
  const base = path.join(repoRoot, 'src', kind)
  return await listSubDirs(base)
}

async function buildPackage(pkgDir: string, kind: 'nodes' | 'plugins', config: any) {
  const name = pkgNameFromPath(pkgDir)
  const outBaseDir = path.join(repoRoot, config.outDir, kind)
  const summary: any[] = []

  console.log(`\n[${kind}/${name}] 开始构建...\n`)

  // 构建 client
  try {
    const r1 = await buildClient({ pkgDir, kind, outBaseDir })
    const item = (r1 as any).skipped ? { kind, name, part: 'client', ...r1 } : { part: 'client', ...r1 }
    summary.push(item)
    if (!r1.skipped) {
      console.log(`  ✅ client => ${r1.outDir}/${r1.outFile} (${r1.mode})`)
    }
    else {
      console.log(`  ⏭️  client 已跳过 (${r1.reason})`)
    }
  }
  catch (e) {
    console.error(`  ❌ client 构建失败:`, e)
    summary.push({ kind, name, part: 'client', error: String(e) })
  }

  // 构建 runtime
  try {
    const r2 = await buildRuntime({ pkgDir, kind, outBaseDir })
    const item = (r2 as any).skipped ? { kind, name, part: 'runtime', ...r2 } : { part: 'runtime', ...r2 }
    summary.push(item)
    if (!r2.skipped) {
      console.log(`  ✅ runtime => ${r2.outDir}/${r2.outFile} (${r2.mode})`)
    }
    else {
      console.log(`  ⏭️  runtime 已跳过 (${r2.reason})`)
    }
  }
  catch (e) {
    console.error(`  ❌ runtime 构建失败:`, e)
    summary.push({ kind, name, part: 'runtime', error: String(e) })
  }

  // 扁平化输出结构并拷贝 package.json
  try {
    const fin = await finalizePackage({ pkgDir, kind, outBaseDir })
    summary.push({ part: 'finalize', ...fin })
    if (fin.html)
      console.log(`  🧩 html => ${fin.outDir}/${fin.html}`)
    if (fin.js)
      console.log(`  🧩 js   => ${fin.outDir}/${fin.js}`)
    if (fin.packageJson)
      console.log(`  🧩 pkg  => ${fin.outDir}/${fin.packageJson}`)
    if (fin.publicDir)
      console.log(`[object Object] => ${fin.outDir}/${fin.publicDir}`)
    if (fin.localesDir)
      console.log(`  🧩 locales => ${fin.outDir}/${fin.localesDir}`)
  }
  catch (e) {
    console.error(`  ❌ finalize 失败:`, e)
    summary.push({ kind, name, part: 'finalize', error: String(e) })
  }

  return summary
}

async function fullBuild(config: any) {
  const summary: any[] = []

  console.log('\n🚀 开始构建...\n')

  for (const kind of config.kinds) {
    const pkgDirs = await scanKindDirs(kind)

    if (pkgDirs.length === 0) {
      console.log(`⚠️  未找到 ${kind} 包`)
      continue
    }

    // 应用 allow 和 ignore 过滤
    let filtered = pkgDirs

    // 如果配置了 allow 列表，只构建在列表中的包
    const allowList = config.allow[kind]
    if (allowList && allowList.length > 0) {
      filtered = filtered.filter(d => allowList.includes(pkgNameFromPath(d)))
      if (config.verbose) {
        console.log(`  📋 应用 allow 过滤: ${allowList.join(', ')}`)
      }
    }

    // 应用 ignore 列表，排除在列表中的包
    const ignoreList = config.ignore[kind]
    if (ignoreList && ignoreList.length > 0) {
      filtered = filtered.filter(d => !ignoreList.includes(pkgNameFromPath(d)))
      if (config.verbose) {
        console.log(`  📋 应用 ignore 过滤: ${ignoreList.join(', ')}`)
      }
    }

    if (filtered.length === 0) {
      console.log(`⚠️  ${kind} 在应用过滤后无可构建的包`)
      continue
    }

    console.log(`\n📦 构建 ${kind} (共 ${filtered.length} 个)\n`)

    for (const pkgDir of filtered) {
      const buildSummary = await buildPackage(pkgDir, kind, config)
      summary.push(...buildSummary)
    }
  }

  // 输出构建摘要
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 构建摘要')
  console.log(`${'='.repeat(60)}\n`)

  const grouped = summary.reduce((acc, s) => {
    const key = `${s.kind}/${s.name}`
    if (!acc[key])
      acc[key] = []
    acc[key].push(s)
    return acc
  }, {} as Record<string, any[]>)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const [key, items] of Object.entries(grouped)) {
    console.log(`📦 ${key}`)
    for (const item of items as any[]) {
      if (item.error) {
        console.log(`  ❌ ${item.part}: 构建失败`)
        errorCount++
      }
      else if (item.skipped) {
        console.log(`  ⏭️  ${item.part}: 已跳过 (${item.reason})`)
        skipCount++
      }
      else {
        console.log(`  ✅ ${item.part}: ${item.outFile}`)
        successCount++
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`✅ 成功: ${successCount} | ⏭️  跳过: ${skipCount} | ❌ 失败: ${errorCount}`)
  console.log(`${'='.repeat(60)}\n`)

  const distRoot = path.join(repoRoot, config.outDir)
  if (config.output.type === 'merge') {
    try {
      const res = await writeRootNodeRedManifest(distRoot, config.output.merge?.rootPackage)
      console.log(`📝 已生成 Node-RED manifest: ${res.manifestPath} (nodes=${res.nodes}, plugins=${res.plugins})`)
    }
    catch (e) {
      console.error('⚠️  生成 Node-RED 清单失败:', e)
    }
  }
  else {
    try {
      await flattenDist(distRoot)
      console.log(`🧱 已扁平化输出到: ${distRoot}`)
    }
    catch (e) {
      console.error('⚠️  扁平化输出失败:', e)
    }
  }

  return { successCount, skipCount, errorCount }
}

async function handleFileChange(filePath: string, config: any) {
  // 确定变更所属的包
  const srcDir = path.join(repoRoot, 'src')
  const relativePath = path.relative(srcDir, filePath)
  const parts = relativePath.split(path.sep)

  if (parts.length < 2)
    return

  const kind = parts[0] as 'nodes' | 'plugins'
  const pkgName = parts[1]

  // 验证 kind 是否有效
  if (!['nodes', 'plugins'].includes(kind))
    return

  // 获取包目录
  const pkgDir = path.join(srcDir, kind, pkgName)

  // 应用 allow 和 ignore 过滤
  if (config.allow[kind] && config.allow[kind].length > 0) {
    if (!config.allow[kind].includes(pkgName))
      return
  }

  if (config.ignore[kind] && config.ignore[kind].includes(pkgName))
    return

  console.log(`\n📝 检测到文件变更: ${relativePath}`)

  const summary: any[] = []

  try {
    const buildSummary = await buildPackage(pkgDir, kind, config)
    summary.push(...buildSummary)

    // 如果是 merge 模式，更新根 manifest
    if (config.output.type === 'merge') {
      try {
        const distRoot = path.join(repoRoot, config.outDir)
        const res = await writeRootNodeRedManifest(distRoot, config.output.merge?.rootPackage)
        console.log(`📝 已更新 Node-RED manifest: ${res.manifestPath}`)
      }
      catch (e) {
        console.error('⚠️  更新 Node-RED 清单失败:', e)
      }
    }

    const errorCount = summary.filter(s => s.error).length
    if (errorCount === 0) {
      console.log(`\n✅ 增量构建完成 [${kind}/${pkgName}]\n`)
      return true
    }
    else {
      console.log(`\n⚠️  增量构建完成，但有 ${errorCount} 个错误 [${kind}/${pkgName}]\n`)
      return false
    }
  }
  catch (e) {
    console.error(`\n❌ 增量构建失败 [${kind}/${pkgName}]:`, e)
    return false
  }
}

/**
 * 启动 Node-RED 进程
 */
function startNodeRed(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('\n🚀 启动 Node-RED...\n')

    nodeRedProcess = spawn('node-red', [], {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: true,
    })

    nodeRedProcess.on('error', (error) => {
      console.error('❌ 启动 Node-RED 失败:', error)
      reject(error)
    })

    nodeRedProcess.on('exit', (code, signal) => {
      if (!isRestarting) {
        console.log(`\n⚠️  Node-RED 进程已退出 (code: ${code}, signal: ${signal})`)
      }
      nodeRedProcess = null
    })

    // 等待一下让 Node-RED 启动
    setTimeout(() => {
      console.log('✅ Node-RED 已启动\n')
      resolve()
    }, 2000)
  })
}

/**
 * 停止 Node-RED 进程
 */
function stopNodeRed(): Promise<void> {
  return new Promise((resolve) => {
    if (!nodeRedProcess) {
      resolve()
      return
    }

    console.log('\n🛑 停止 Node-RED...')

    const timeout = setTimeout(() => {
      console.log('⚠️  Node-RED 未能正常关闭，强制杀死进程')
      if (nodeRedProcess) {
        nodeRedProcess.kill('SIGKILL')
      }
      resolve()
    }, 5000)

    nodeRedProcess.on('exit', () => {
      clearTimeout(timeout)
      resolve()
    })

    // 发送 SIGTERM 信号
    nodeRedProcess.kill('SIGTERM')
  })
}

/**
 * 重启 Node-RED 进程
 */
async function restartNodeRed(): Promise<void> {
  if (isRestarting)
    return

  isRestarting = true
  try {
    await stopNodeRed()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await startNodeRed()
  }
  finally {
    isRestarting = false
  }
}

async function run() {
  const config = await getFinalConfig()

  console.log('\n👀 启动文件监听模式...\n')
  console.log(`📂 监听目录: ${path.join(repoRoot, 'src')}`)
  console.log(`📤 输出目录: ${path.join(repoRoot, config.outDir)}`)
  console.log(`⚙️  配置: kinds=${config.kinds.join(',')}, verbose=${config.verbose}`)
  console.log(`\n按 Ctrl+C 停止监听\n`)

  // 首先执行一次完整构建
  await fullBuild(config)

  // 启动 Node-RED
  try {
    await startNodeRed()
  }
  catch (e) {
    console.error('❌ 启动 Node-RED 失败:', e)
    console.log('⚠️  将继续监听文件变更，但 Node-RED 未运行\n')
  }

  // 设置文件监听
  const watchPath = path.join(repoRoot, 'src')
  watcher = chokidar.watch(watchPath, {
    ignored: [
      '**/node_modules',
      '**/.git',
      '**/.DS_Store',
      '**/dist',
      '**/*.swp',
      '**/*~',
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  })

  watcher.on('change', async (filePath) => {
    if (isBuilding) {
      pendingRebuild = true
      console.log(`⏳ 构建进行中，将在完成后重新构建...`)
      return
    }

    isBuilding = true
    try {
      const success = await handleFileChange(filePath, config)
      if (success && nodeRedProcess) {
        await restartNodeRed()
      }
    }
    finally {
      isBuilding = false

      // 如果在构建过程中有新的变更，立即重新构建
      if (pendingRebuild) {
        pendingRebuild = false
        console.log(`\n🔄 重新构建所有包...\n`)
        try {
          const result = await fullBuild(config)
          if (result.errorCount === 0 && nodeRedProcess) {
            await restartNodeRed()
          }
        }
        catch (e) {
          console.error('❌ 完整构建失败:', e)
        }
      }
    }
  })

  watcher.on('add', async (filePath) => {
    if (isBuilding) {
      pendingRebuild = true
      console.log(`⏳ 构建进行中，将在完成后重新构建...`)
      return
    }

    isBuilding = true
    try {
      const success = await handleFileChange(filePath, config)
      if (success && nodeRedProcess) {
        await restartNodeRed()
      }
    }
    finally {
      isBuilding = false

      if (pendingRebuild) {
        pendingRebuild = false
        console.log(`\n🔄 重新构建所有包...\n`)
        try {
          const result = await fullBuild(config)
          if (result.errorCount === 0 && nodeRedProcess) {
            await restartNodeRed()
          }
        }
        catch (e) {
          console.error('❌ 完整构建失败:', e)
        }
      }
    }
  })

  watcher.on('unlink', async (filePath) => {
    if (isBuilding) {
      pendingRebuild = true
      console.log(`⏳ 构建进行中，将在完成后重新构建...`)
      return
    }

    isBuilding = true
    try {
      const success = await handleFileChange(filePath, config)
      if (success && nodeRedProcess) {
        await restartNodeRed()
      }
    }
    finally {
      isBuilding = false

      if (pendingRebuild) {
        pendingRebuild = false
        console.log(`\n🔄 重新构建所有包...\n`)
        try {
          const result = await fullBuild(config)
          if (result.errorCount === 0 && nodeRedProcess) {
            await restartNodeRed()
          }
        }
        catch (e) {
          console.error('❌ 完整构建失败:', e)
        }
      }
    }
  })

  watcher.on('error', (error) => {
    console.error('❌ 监听错误:', error)
  })

  // 处理进程信号
  process.on('SIGINT', async () => {
    console.log('\n\n👋 正在关闭...')
    if (watcher) {
      await watcher.close()
    }
    if (nodeRedProcess) {
      await stopNodeRed()
    }
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\n\n👋 正在关闭...')
    if (watcher) {
      await watcher.close()
    }
    if (nodeRedProcess) {
      await stopNodeRed()
    }
    process.exit(0)
  })
}

run().catch((e) => {
  console.error('❌ 监听模式启动失败:', e)
  process.exit(1)
})
