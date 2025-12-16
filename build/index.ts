/* eslint-disable no-console */
import path from 'node:path'
import process from 'node:process'
import { buildClient } from './build.client'
import { finalizePackage, flattenDist, writeRootNodeRedManifest } from './build.end'
import { buildRuntime } from './build.runtime'
import { getFinalConfig } from './load-config'
import { listSubDirs, pkgNameFromPath, repoRoot } from './utils'

async function scanKindDirs(kind: 'nodes' | 'plugins') {
  const base = path.join(repoRoot, 'src', kind)
  return await listSubDirs(base)
}

async function run() {
  const config = await getFinalConfig()
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

    const outBaseDir = path.join(repoRoot, config.outDir, kind)

    for (const pkgDir of filtered) {
      const name = pkgNameFromPath(pkgDir)
      console.log(`[${kind}/${name}]`)

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
          console.log(`  🧩 public => ${fin.outDir}/${fin.publicDir}`)
        if (fin.localesDir)
          console.log(`  🧩 locales => ${fin.outDir}/${fin.localesDir}`)
      }
      catch (e) {
        console.error(`  ❌ finalize 失败:`, e)
        summary.push({ kind, name, part: 'finalize', error: String(e) })
      }
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

  if (errorCount > 0) {
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('❌ 构建过程出错:', e)
  process.exit(1)
})
