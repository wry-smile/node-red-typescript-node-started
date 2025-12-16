import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export type PackageKind = 'nodes' | 'plugins'

export const repoRoot = typeof __dirname !== 'undefined'
  ? path.resolve(__dirname, '..')
  : process.cwd()

export async function pathExists(p: string) {
  try {
    await fs.access(p)
    return true
  }
  catch {
    return false
  }
}

export async function readJSON<T = any>(p: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(p, 'utf-8')
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

export async function listSubDirs(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries.filter(e => e.isDirectory()).map(e => path.join(dir, e.name))
}

export function pkgNameFromPath(absPath: string) {
  return path.basename(absPath)
}

export async function findClientConfig(pkgDir: string): Promise<string | null> {
  const candidates = [
    'vite.client.config.ts',
    'vite.client.config.js',
  ]
  for (const f of candidates) {
    const p = path.join(pkgDir, f)
    if (await pathExists(p))
      return p
  }
  return null
}

export async function findRuntimeConfig(pkgDir: string): Promise<string | null> {
  const candidates = [
    'vite.runtime.config.ts',
    'vite.runtime.config.js',
  ]
  for (const f of candidates) {
    const p = path.join(pkgDir, f)
    if (await pathExists(p))
      return p
  }
  return null
}

export async function detectParts(pkgDir: string) {
  const hasClient = await pathExists(path.join(pkgDir, 'client', 'editor.html'))
  const hasRuntime = await pathExists(path.join(pkgDir, 'runtime', 'index.ts'))
  return { hasClient, hasRuntime }
}
