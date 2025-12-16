import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pkgNameFromPath } from './utils'

export interface FinalizeOptions {
  pkgDir: string // 绝对路径：src/{kind}/{name}
  kind: 'nodes' | 'plugins'
  outBaseDir: string // 绝对路径：dist/{kind}
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function pathExists(p: string) {
  try {
    await fs.access(p)
    return true
  }
  catch {
    return false
  }
}

async function moveFileSafe(src: string, dest: string) {
  await ensureDir(path.dirname(dest))
  try {
    await fs.rename(src, dest)
  }
  catch {
    // 例如跨分区时，使用 copy + unlink
    await fs.copyFile(src, dest)
    await fs.unlink(src)
  }
}

async function copyDirRecursive(srcDir: string, destDir: string) {
  if (!(await pathExists(srcDir)))
    return false
  await ensureDir(destDir)
  const entries = await fs.readdir(srcDir, { withFileTypes: true })
  for (const entry of entries) {
    const src = path.join(srcDir, entry.name)
    const dest = path.join(destDir, entry.name)
    if (entry.isDirectory()) {
      await copyDirRecursive(src, dest)
    }
    else if (entry.isFile()) {
      await ensureDir(path.dirname(dest))
      await fs.copyFile(src, dest)
    }
  }
  return true
}

async function removeDirIfEmpty(dir: string) {
  try {
    const entries = await fs.readdir(dir)
    if (entries.length === 0)
      await fs.rmdir(dir)
  }
  catch {
    // ignore
  }
}

export async function finalizePackage(opts: FinalizeOptions) {
  const { pkgDir, kind, outBaseDir } = opts
  const name = pkgNameFromPath(pkgDir)
  const pkgOutDir = path.join(outBaseDir, name)

  const clientDir = path.join(pkgOutDir, 'client')
  const runtimeDir = path.join(pkgOutDir, 'runtime')

  // 目标文件路径
  const targetHtml = path.join(pkgOutDir, `${name}.html`)
  const targetJs = path.join(pkgOutDir, `${name}.js`)

  // 可能的源文件路径（HTML）
  const htmlCandidates = [
    path.join(clientDir, `${name}.html`), // 我们期望的命名
    path.join(clientDir, 'editor.html'), // Vite 默认产物
  ]

  // 可能的源文件路径（JS）
  const jsCandidates = [
    path.join(runtimeDir, `${name}.js`), // 我们期望的命名
    path.join(runtimeDir, 'runtime.js'), // 自定义构建可能未改名
  ]

  let movedHtml = false
  for (const src of htmlCandidates) {
    if (await pathExists(src)) {
      await moveFileSafe(src, targetHtml)
      movedHtml = true
      break
    }
  }

  let movedJs = false
  for (const src of jsCandidates) {
    if (await pathExists(src)) {
      await moveFileSafe(src, targetJs)
      movedJs = true
      break
    }
  }

  // 拷贝 package.json（如果存在）
  const srcPkgJson = path.join(pkgDir, 'package.json')
  const distPkgJson = path.join(pkgOutDir, 'package.json')
  let copiedPkg = false
  if (await pathExists(srcPkgJson)) {
    await ensureDir(pkgOutDir)
    await fs.copyFile(srcPkgJson, distPkgJson)
    copiedPkg = true
  }

  // 复制 public 与 locales 目录（如果存在）
  const srcPublic = path.join(pkgDir, 'public')
  const dstPublic = path.join(pkgOutDir, 'public')
  const copiedPublic = await copyDirRecursive(srcPublic, dstPublic)

  const srcLocales = path.join(pkgDir, 'locales')
  const dstLocales = path.join(pkgOutDir, 'locales')
  const copiedLocales = await copyDirRecursive(srcLocales, dstLocales)

  // 清理空目录
  await removeDirIfEmpty(clientDir)
  await removeDirIfEmpty(runtimeDir)

  return {
    kind,
    name,
    outDir: pkgOutDir,
    html: movedHtml ? `${name}.html` : null,
    js: movedJs ? `${name}.js` : null,
    packageJson: copiedPkg ? 'package.json' : null,
    publicDir: copiedPublic ? 'public' : null,
    localesDir: copiedLocales ? 'locales' : null,
  }
}

/**
 * 根据 dist 的最终产物扫描并写入 dist 根目录的 package.json（Node-RED 映射）
 * 结构：
 * {
 *   "node-red": {
 *     "plugins": { name: "plugins/name/name.js" },
 *     "nodes":   { name: "nodes/name/name.js" }
 *   }
 * }
 */
export async function writeRootNodeRedManifest(distRoot: string, baseFields?: Record<string, any>) {
  const result = { nodes: 0, plugins: 0, manifestPath: path.join(distRoot, 'package.json') }

  const ensureKind = async (kind: 'nodes' | 'plugins') => {
    const kindDir = path.join(distRoot, kind)
    if (!(await pathExists(kindDir)))
      return { kind, map: {} as Record<string, string> }

    const entries = await fs.readdir(kindDir, { withFileTypes: true })
    const map: Record<string, string> = {}
    for (const entry of entries) {
      if (!entry.isDirectory())
        continue
      const name = entry.name
      const jsPath = path.join(kindDir, name, `${name}.js`)
      if (await pathExists(jsPath)) {
        map[name] = `${kind}/${name}/${name}.js`
      }
    }
    return { kind, map }
  }

  await ensureDir(distRoot)
  const [nodesRes, pluginsRes] = await Promise.all([ensureKind('nodes'), ensureKind('plugins')])

  const base: Record<string, any> = { ...(baseFields || {}) }
  if ('node-red' in base)
    delete (base as any)['node-red']
  if (!base.name || typeof base.name !== 'string' || !base.name.trim())
    base.name = 'node-red-merge'

  const manifest = {
    ...base,
    'node-red': {
      nodes: nodesRes.map,
      plugins: pluginsRes.map,
    },
  }

  await fs.writeFile(result.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  result.nodes = Object.keys(nodesRes.map).length
  result.plugins = Object.keys(pluginsRes.map).length

  return result
}

/**
 * 将 dist/nodes 与 dist/plugins 下的包目录提升到 dist 根目录
 * - 结果：dist/<name>/...
 * - 不再保留 dist/nodes 与 dist/plugins（若清空则删除）
 * - 删除 dist/package.json（如存在）
 */
export async function flattenDist(distRoot: string) {
  const kinds: Array<'nodes' | 'plugins'> = ['nodes', 'plugins']

  const moveUp = async (srcDir: string, dstDir: string) => {
    // 将 srcDir 的内容合并到 dstDir（存在则覆盖）
    await copyDirRecursive(srcDir, dstDir)
    // 删除源目录
    try {
      await fs.rm(srcDir, { recursive: true, force: true })
    }
    catch {
      // ignore
    }
  }

  for (const kind of kinds) {
    const kindDir = path.join(distRoot, kind)
    if (!(await pathExists(kindDir)))
      continue
    const entries = await fs.readdir(kindDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory())
        continue
      const name = entry.name
      const src = path.join(kindDir, name)
      const dest = path.join(distRoot, name)
      await moveUp(src, dest)
    }
    // 尝试清理空的 kind 目录
    try {
      await fs.rmdir(kindDir)
    }
    catch {
      // ignore
    }
  }

  // 删除合并 package.json（如存在）
  const rootPkg = path.join(distRoot, 'package.json')
  if (await pathExists(rootPkg)) {
    try { await fs.unlink(rootPkg) }
    catch {}
  }
}
