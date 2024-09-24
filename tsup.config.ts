import { join, resolve } from 'node:path'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import type { Options } from 'tsup'
import { defineConfig } from 'tsup'
import { glob } from 'glob'

type ESBuildPlugin = Required<Options>['plugins'][number]

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

function createHTMLPlugin(node: string): ESBuildPlugin {
  return {
    name: 'node-red-html-plugin',
    renderChunk(code) {
      const htmlFiles = glob.sync(join(`./src/nodes/${node}/client`, '*.html').replaceAll(/\\/g, '/'))
      const htmlContents = htmlFiles.map(filePath => readFileSync(filePath))
      code
        = `<script type="text/javascript">\n${code
        }\n`
        + `</script>\n${htmlContents.join('\n')}`

      writeFileSync(join(`./dist/${node}`, `${node}.html`), code, 'utf-8')
    },
  }
}

function createNodePackageJSONPlugin(node: string): ESBuildPlugin {
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

function createLocalePlugin(node: string): ESBuildPlugin {
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
        entry: {
          [next]: resolve(`./src/nodes/${next}/runtime/index.ts`),
        },
        outDir: resolve(`./dist/${next}`),
        format: ['cjs'],
        clean: true,
        splitting: true,
      },
      {
        name: 'client',
        entry: [resolve(`./src/nodes/${next}/client/index.ts`)],
        outDir: resolve(`./dist/${next}`),
        format: ['iife'],
        clean: true,
        plugins: [
          createHTMLPlugin(next),
          createNodePackageJSONPlugin(next),
          createLocalePlugin(next),
        ],
      },
    ]
    return [...prev, ...nodeEntry]
  }, [] as Options[])
}

export default defineConfig(createBundles())
