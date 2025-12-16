import type { PackageKind } from './utils'

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
   * 是否启用详细日志
   * @default false
   */
  verbose?: boolean

  /**
   * dist 输出类型
   * - merge: 维持 nodes/plugins 结构，并在 dist 根写合并 package.json
   * - flat: 提升 nodes/plugins 下的包至 dist 根，不生成合并 package.json
   */
  output?: OutputConfig
}

/**
 * 默认配置
 */
export const defaultConfig: Required<BuildConfig> = {
  kinds: ['nodes', 'plugins'],
  allow: { nodes: [], plugins: [] },
  ignore: { nodes: [], plugins: [] },
  outDir: 'dist',
  verbose: false,
  output: { type: 'merge', merge: { rootPackage: { name: 'node-red-merge' } } },
}

/**
 * 合并配置
 */
export function mergeConfig(userConfig?: Partial<BuildConfig>): Required<BuildConfig> {
  const config = { ...defaultConfig, ...userConfig }

  config.allow = {
    nodes: userConfig?.allow?.nodes ?? [],
    plugins: userConfig?.allow?.plugins ?? [],
  }
  config.ignore = {
    nodes: userConfig?.ignore?.nodes ?? [],
    plugins: userConfig?.ignore?.plugins ?? [],
  }

  // 合并 output
  const userOutput = userConfig?.output ?? { type: 'merge' }
  if (userOutput.type === 'flat') {
    config.output = { type: 'flat' }
  }
  else {
    const userRoot = { ...(userOutput.merge?.rootPackage ?? {}) }
    if ('node-red' in userRoot)
      delete (userRoot as any)['node-red']
    const mergedRoot = { name: 'node-red-merge', ...userRoot }
    if (!mergedRoot.name || typeof mergedRoot.name !== 'string' || !mergedRoot.name.trim())
      mergedRoot.name = 'node-red-merge'
    config.output = { type: 'merge', merge: { rootPackage: mergedRoot } }
  }

  return config as Required<BuildConfig>
}
