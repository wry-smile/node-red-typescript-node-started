#!/usr/bin/env node
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export async function runGenerator() {
  const __dirname = dirname(fileURLToPath(import.meta.url))

  // Plop expects a full argv array, with the first two elements being node executable and script path.
  // We can provide placeholders since they are not used for argument parsing.

  if (process.argv[2] === 'gen') {
    process.argv.splice(2, 1)
  }

  const { Plop, run } = await import('plop')

  Plop.prepare(

    {
      cwd: process.cwd(),
      configPath: join(__dirname, '../dist/generate.js'),
    },
    env => Plop.execute({ ...env }, run),
  )
}

// If the script is run directly, execute the generator
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runGenerator()
}
