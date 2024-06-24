import { defineConfig, Options, } from 'tsup'
import { Plugin } from 'esbuild'
import packageJSON from './package.json'
import { dirname, join, resolve } from 'path'
import { glob } from 'glob'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const allNodeTypes = Object.keys(packageJSON['node-red'].nodes)

function bundleHTML(node: string): Plugin {
  return {
    name: 'bundler-html',
    setup(build) {

      build.onEnd(result => {
        result.outputFiles?.forEach(file => {
          const { path, text } = file
          const htmlFiles = glob.sync(join(`./src/nodes/${node}/client`, '*.html'))
          const htmlContents = htmlFiles.map(filePath => readFileSync(filePath))
          const code =
            '<script type="text/javascript">\n' +
            text +
            "\n" +
            "</script>\n" +
            htmlContents.join("\n")



          if (!existsSync(dirname(path))) {
            mkdirSync(dirname(path))
          }
          writeFileSync(join(dirname(path), `${node}.html`), code, 'utf-8')
          // unlinkSync(path)
        });
      })
    },
  }
}

function generateHTMLBundle(node: string) {
  const javascriptCode = readFileSync(resolve(`./dist/${node}/${node}.html.global.js`))

  const htmlFiles = glob.sync(join(`./src/nodes/${node}/client`, '*.html'))
  const htmlContents = htmlFiles.map(filePath => readFileSync(filePath))
  const code =
    '<script type="text/javascript">\n' +
    javascriptCode +
    "\n" +
    "</script>\n" +
    htmlContents.join("\n")

  writeFileSync(join(`./dist/${node}`, `${node}.html`), code, 'utf-8')
}

function generatePackageJSON(node: string) {
  const json = {
    "name": `node-red-thingskit-${node}`,
    "version": "1.0.0",
    "description": "",
    "keywords": [],
    "author": "",
    "license": "ISC",
    "node-red": {
      "nodes": {
        [node]: `${node}.js`
      }
    }
  }
  writeFileSync(join(`./dist/${node}`, `package.json`), JSON.stringify(json, null, 2), 'utf-8')
}

function createBundles(): Options[] {
  return allNodeTypes.reduce((prev, next) => {

    const nodeEntry: Options[] = [
      {
        name: 'runtime',
        entry: {
          [next]: resolve(`./src/nodes/${next}/runtime/index.ts`)
        },
        outDir: resolve(`./dist/${next}`),
        format: ['cjs'],
        clean: true,
        external: ['mqtt'],
      },
      {
        name: 'client',
        entry: {
          [`${next}.html`]: resolve(`./src/nodes/${next}/client/index.ts`)
        },
        outDir: resolve(`./dist/${next}`),
        format: ['iife'],
        clean: true,
        // esbuildPlugins: [bundleHTML(next)],
        onSuccess: async () => {
          generateHTMLBundle(next)
          generatePackageJSON(next)
        }
      }
    ]

    return [...prev, ...nodeEntry]
  }, [] as Options[])
}



export default defineConfig(createBundles())
