import type { SingleBuildOptions } from './single-build'
import type { PackageKind } from './utils'
import { resolve } from 'node:path'
import { listSubDirs, pkgNameFromPath, repoRoot } from './utils'

export interface OutputMergeOptions {
  rootPackage?: Record<string, any>
}

export type OutputConfig
  = | { type: 'merge', merge?: OutputMergeOptions }
    | { type: 'flat' }

/**
 * 构建配置接口
 */
export interface BuildConfig {
  /**
   * 要构建的包类型
   * @default ['nodes', 'plugins']
   */
  kinds?: PackageKind[]

  /**
   * 允许构建的包名称
   * 如果指定，只有在此列表中的包才会被构建
   * @example { nodes: ['simple-node'], plugins: ['simple-plugin'] }
   */
  allow?: Record<PackageKind, string[]>

  /**
   * 忽略的包名称
   * 在此列表中的包将被跳过
   * @example { nodes: ['test-node'], plugins: [] }
   */
  ignore?: Record<PackageKind, string[]>

  /**
   * 输出目录基础路径
   * @default '<repoRoot>/dist'
   */
  outDir?: string

  /**
   * dist 输出类型
   * - merge: 维持 nodes/plugins 结构，并在 dist 根写合并 package.json
   * - flat: 提升 nodes/plugins 下的包至 dist 根，不生成合并 package.json
   */
  output?: OutputConfig
}

export interface PackageRootType {
  root: string
  kind: PackageKind
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<BuildConfig> = {
  kinds: ['nodes', 'plugins'],
  allow: { nodes: [], plugins: [] },
  ignore: { nodes: [], plugins: [] },
  outDir: 'dist',
  output: { type: 'merge', merge: { rootPackage: { name: 'node-red-merge' } } },
}

export const PACKAGE_ROOTS: PackageRootType[] = [
  {
    root: resolve(repoRoot, './src/nodes'),
    kind: 'nodes',
  },
  {
    root: resolve(repoRoot, './src/plugins'),
    kind: 'plugins',
  },
]

/**
 * 合并配置
 */
export function mergeConfig(userConfig?: Partial<BuildConfig>): Required<BuildConfig> {
  const config = { ...DEFAULT_CONFIG, ...userConfig }

  config.allow = {
    nodes: userConfig?.allow?.nodes ?? [],
    plugins: userConfig?.allow?.plugins ?? [],
  }
  config.ignore = {
    nodes: userConfig?.ignore?.nodes ?? [],
    plugins: userConfig?.ignore?.plugins ?? [],
  }

  const userOutput = userConfig?.output ?? { type: 'merge' }

  if (userOutput.type === 'flat') {
    config.output = {
      type: 'flat',
    }
  }
  else {
    const userRoot = { ...(userOutput.merge?.rootPackage ?? {}) }
    if ('node-red' in userRoot)
      delete userRoot['node-red']

    const mergedRoot = {
      name: 'node-red-merge',
      ...userRoot,
    }
    if (!mergedRoot.name || typeof mergedRoot.name !== 'string' || !mergedRoot.name.trim())
      mergedRoot.name = 'node-red-merge'
    config.output = {
      type: 'merge',
      merge: {
        rootPackage: mergedRoot,
      },
    }
  }

  return config as Required<BuildConfig>
}

export function filterPackageByConfig(config: Required<BuildConfig>, packageRoots: PackageRootType[] = PACKAGE_ROOTS): SingleBuildOptions[] {
  let roots = packageRoots.flatMap(packages =>
    listSubDirs(packages.root).map(entryRoot => ({
      kind: packages.kind,
      entryRoot,
      scope: pkgNameFromPath(entryRoot),
    })),
  )

  const { allow, ignore, kinds } = config

  if (kinds?.length) {
    roots = roots.filter(root => kinds.includes(root.kind as PackageKind))
  }

  if (allow) {
    const allowedScopes = new Set([...(allow.nodes ?? []), ...(allow.plugins ?? [])])

    if (allowedScopes.size > 0) {
      roots = roots.filter(root => allowedScopes.has(root.scope as PackageKind))
    }
  }

  if (ignore) {
    const ignoredScopes = new Set([...(ignore.nodes ?? []), ...(ignore.plugins ?? [])])
    if (ignoredScopes.size > 0) {
      roots = roots.filter(root => !ignoredScopes.has(root.scope as PackageKind))
    }
  }

  return roots
}
