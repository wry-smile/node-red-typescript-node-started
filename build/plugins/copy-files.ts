import type { PluginOptions, TsUpPlugin } from '../types'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathExists } from '../utils'

export interface CopyFileItem {
  src: string

  dest?: string
}

export interface CopyPluginOptions extends PluginOptions {
  files?: CopyFileItem[]
}

/**
 * 递归复制目录
 * @param src 源目录路径
 * @param dest 目标目录路径
 */
function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  const items = readdirSync(src)

  for (const item of items) {
    const srcPath = join(src, item)
    const destPath = join(dest, item)
    const stat = statSync(srcPath)

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath)
    }
    else {
      copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * 复制文件或目录
 * @param src 源文件或目录路径
 * @param dest 目标文件或目录路径
 */
function copyFileOrDir(src: string, dest: string): void {
  const stat = statSync(src)

  if (stat.isDirectory()) {
    copyDir(src, dest)
  }
  else {
    mkdirSync(join(dest, '..'), { recursive: true })
    copyFileSync(src, dest)
  }
}

export function copyFilesPlugin(options: CopyPluginOptions): TsUpPlugin {
  const { files = [] } = options

  return {
    name: 'copy-files-plugin',
    buildEnd() {
      for (const item of files) {
        const { src, dest } = item

        if (!src || !pathExists(src)) {
          continue
        }

        const targetDest = dest || options.outputRoot

        try {
          copyFileOrDir(src, targetDest)
        }
        catch (error) {
          console.error(`[copy-files-plugin] copy failed: ${src}`, error)
        }
      }
    },
  }
}
