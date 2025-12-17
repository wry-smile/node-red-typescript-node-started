import { accessSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { cwd } from 'node:process'

export type PackageKind = 'nodes' | 'plugins'

function getRepoRoot(): string {
  return resolve(__dirname ?? cwd(), '..')
}

export const repoRoot = getRepoRoot()

export function pathExists(p: string) {
  try {
    accessSync(p)
    return true
  }
  catch {
    return false
  }
}

export function readJSON<T = any>(p: string): T | null {
  try {
    const raw = readFileSync(p, 'utf-8')
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

export function listSubDirs(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.filter(e => e.isDirectory()).map(e => join(dir, e.name))
}

export function pkgNameFromPath(absPath: string) {
  return basename(absPath)
}

export function detectParts(pkgDir: string) {
  const hasClient = pathExists(join(pkgDir, 'client', 'editor.html'))
  const hasRuntime = pathExists(join(pkgDir, 'runtime', 'index.ts'))
  return { hasClient, hasRuntime }
}
