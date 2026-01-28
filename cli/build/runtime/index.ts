import type { UserConfig } from 'vite'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

export interface RuntimeConfigOptions {
  entry?: string
  scope?: string
}

export function defineRuntimeConfig(options: RuntimeConfigOptions): UserConfig {
  const { entry, scope } = options
  return {
    build: {
      minify: true,
      outDir: 'dist',
      emptyOutDir: true,
      lib: {
        entry: entry ?? resolve(cwd(), 'runtime', 'index.ts'),
        formats: ['cjs'],
        fileName: () => scope ? `${scope}.js` : 'runtime.js',
      },
      rollupOptions: {
        output: {
          exports: 'default',
        },
      },
    },
  }
}
