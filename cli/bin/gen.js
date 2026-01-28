#!/usr/bin/env node
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export async function runGenerator(args = {}) {
  const __dirname = dirname(fileURLToPath(import.meta.url))

  const allowedKeys = ['outputDir', 'type', 'name', 'locales']

  const envKeys = allowedKeys.map(k => `FLOWUP_GEN_${k.toUpperCase()}`)
  const previousEnv = {}
  for (const k of envKeys)
    previousEnv[k] = process.env[k]

  for (const key of allowedKeys) {
    const value = args?.[key]
    const envKey = `FLOWUP_GEN_${key.toUpperCase()}`
    if (value !== undefined && value !== null && value !== '')
      process.env[envKey] = String(value)
    else
      delete process.env[envKey]
  }

  const originalArgv = process.argv
  process.argv = originalArgv.slice(0, 2)

  try {
    const { Plop, run } = await import('plop')

    Plop.prepare(
      {
        cwd: process.cwd(),
        configPath: join(__dirname, '../dist/generate.js'),
      },
      env => Plop.execute({ ...env }, run),
    )
  }
  finally {
    process.argv = originalArgv
  }
}
// If the script is run directly, execute the generator
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runGenerator()
}
