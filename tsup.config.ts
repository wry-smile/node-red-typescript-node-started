import { dirname, join, resolve } from 'node:path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import type { Options } from 'tsup'
import { defineConfig } from 'tsup'
import type { Plugin } from 'esbuild'
import { glob } from 'glob'

function copyDir(src: string, dest: string) {
  mkdirSync(dest, { recursive: true })
  const copyDirs = readdirSync(src)

  for (const item of copyDirs) {
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

function generateHTMLBundle(node: string) {
  const javascriptCode = readFileSync(resolve(`./dist/${node}/${node}.html.global.js`))

  const htmlFiles = glob.sync(join(`./src/nodes/${node}/client`, '*.html'))
  const htmlContents = htmlFiles.map(filePath => readFileSync(filePath))
  const code
    = `<script type="text/javascript">\n${
     javascriptCode
     }\n`
     + `</script>\n${
     htmlContents.join('\n')}`

  writeFileSync(join(`./dist/${node}`, `${node}.html`), code, 'utf-8')
}

function generatePackageJSON(node: string) {
  const json = {
    'name': `node-red-thingskit-${node}`,
    'version': '1.0.0',
    'description': '',
    'keywords': [],
    'author': '',
    'license': 'ISC',
    'node-red': {
      nodes: {
        [node]: `${node}.js`,
      },
    },
  }
  writeFileSync(join(`./dist/${node}`, `package.json`), JSON.stringify(json, null, 2), 'utf-8')
}

function copylocalesDir(node: string) {
  const localesDir = resolve(`./src/nodes/${node}/locales`)
  copyDir(localesDir, resolve(`./dist/${node}/locales`))
}

function createBundles(): Options[] {
  const allNodeTypes = readdirSync(resolve('./src/nodes'))

  return allNodeTypes.reduce((prev, next) => {
    const nodeEntry: Options[] = [
      {
        name: 'runtime',
        entry: {
          [next]: resolve(`./src/nodes/${next}/runtime/index.ts`),
        },
        outDir: resolve(`./dist/${next}`),
        format: ['cjs'],
        clean: true,
        onSuccess: async () => {
          copylocalesDir(next)
        },
      },
      {
        name: 'client',
        entry: {
          [`${next}.html`]: resolve(`./src/nodes/${next}/client/index.ts`),
        },
        outDir: resolve(`./dist/${next}`),
        format: ['iife'],
        clean: true,
        onSuccess: async () => {
          generateHTMLBundle(next)
          generatePackageJSON(next)
        },
      },
    ]

    return [...prev, ...nodeEntry]
  }, [] as Options[])
}

export default defineConfig(createBundles())
