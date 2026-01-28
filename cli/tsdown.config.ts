import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig([
  {
    entry: {
      generate: resolve(__dirname, './generate/plop.ts'),
    },
    copy: [
      {
        from: resolve(__dirname, './generate/template'),
        to: resolve(__dirname, './dist'),
      },
      {
        from: resolve(__dirname, './generate/template-plugin'),
        to: resolve(__dirname, './dist'),
      },
    ],
    format: ['esm'],
    external: ['plop'],
    outExtensions: () => {
      return {
        js: '.js',
        dts: '.d.ts',
      }
    },
    dts: true,
  },
  {
    entry: {
      build: resolve(__dirname, './build/build.ts'),
    },
    format: ['esm'],
    external: ['vite'],
    dts: true,
    outExtensions: () => {
      return {
        js: '.js',
        dts: '.d.ts',
      }
    },
  },
  {
    entry: {
      index: resolve(__dirname, './build/index.ts'),
    },
    format: ['esm'],
    external: ['vite', '@tailwindcss/vite', '@vitejs/plugin-vue', 'vite-plugin-singlefile'],
    dts: true,
    outExtensions: () => {
      return {
        js: '.js',
        dts: '.d.ts',
      }
    },
  },
])
