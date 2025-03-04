import type { Options } from 'tsup'
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { glob } from 'glob'
import { defineConfig } from 'tsup'

type TsUpPlugin = Required<Options>['plugins'][number]
type EsbuildPlugin = Required<Options>['esbuildPlugins'][number]

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

function mergeHTMLPlugin(node: string): EsbuildPlugin {
  return {
    name: 'node-red-merge-html-plugin',
    setup(build) {
      const htmlFiles = glob.sync(join(`./src/nodes/${node}/client`, '*.html').replaceAll(/\\/g, '/'))
      const htmlContents = htmlFiles.map(filePath => readFileSync(filePath))

      build.onEnd((result) => {
        for (const item of result.outputFiles || []) {
          const decoder = new TextDecoder('utf-8')
          let code = decoder.decode(item.contents)
          const encoder = new TextEncoder()
          code = `<script type="text/javascript">\n ${code}</script>\n${htmlContents.join('\n')}`
          item.contents = encoder.encode(code)
        }
      })
    },
  }
}

function createNodePackageJSONPlugin(node: string): TsUpPlugin {
  return {
    name: 'node-red-node-package',
    buildEnd() {
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
    },
  }
}

function createLocalePlugin(node: string): TsUpPlugin {
  return {
    name: 'node-red-locale',
    buildEnd() {
      const localesDir = resolve(`./src/nodes/${node}/locales`)
      copyDir(localesDir, resolve(`./dist/${node}/locales`))
    },
  }
}

function createBundles(): Options[] {
  const allNodeTypes = readdirSync(resolve('./src/nodes'))

  return allNodeTypes.reduce((prev, next) => {
    const nodeEntry: Options[] = [
      {
        name: 'runtime',
        platform: 'node',
        entry: {
          [next]: resolve(`./src/nodes/${next}/runtime/index.ts`),
        },
        outDir: resolve(`./dist/${next}`),
        format: ['cjs'],
        splitting: true,
        cjsInterop: true,
        noExternal: [/.*/],
        publicDir: resolve(`./src/nodes/${next}/public`),
        watch: `./src/nodes/${next}/runtime/*`,
      },
      {
        name: 'client',
        platform: 'browser',
        entry: {
          [next]: resolve(`./src/nodes/${next}/client/index.ts`),
        },
        outDir: resolve(`./dist/${next}`),
        format: ['iife'],
        plugins: [
          createNodePackageJSONPlugin(next),
          createLocalePlugin(next),
        ],
        esbuildPlugins: [mergeHTMLPlugin(next)],
        noExternal: [/.*/],
        outExtension: () => {
          return {
            js: '.html',
          }
        },
        watch: `./src/nodes/${next}/client/*`,
      },
    ]
    return [...prev, ...nodeEntry]
  }, [] as Options[])
}

export default defineConfig(createBundles())
