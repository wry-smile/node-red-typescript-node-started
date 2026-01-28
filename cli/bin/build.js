#!/usr/bin/env node
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { buildEntry as build } from '../dist/build.js'

export function buildEntry() {
  return build()
}

// If the script is run directly, execute the build
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildEntry().catch((err) => {
    console.error('Build failed:', err)
    process.exit(1)
  })
}
