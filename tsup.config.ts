import type { Options } from 'tsup'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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

function mergeHTMLPlugin(group: 'nodes' | 'plugins', name: string): EsbuildPlugin {
  return {
    name: 'node-red-merge-html-plugin',
    setup(build) {
      const htmlGlob = join(`./src/${group}/${name}/client`, '*.html').replaceAll(/\\/g, '/')

      build.onEnd((result) => {
        const htmlFiles = glob.sync(htmlGlob)
        const htmlContents = htmlFiles.map(filePath => readFileSync(filePath, 'utf-8'))

        for (const item of result.outputFiles || []) {
          const decoder = new TextDecoder('utf-8')
          let code = decoder.decode(item.contents)
          const encoder = new TextEncoder()
          code = `<script type=\"text/javascript\">\n ${code}</script>\n${htmlContents.join('\n')}`
          item.contents = encoder.encode(code)
        }
      })
    },
  }
}

function createItemPackageJSONPlugin(group: 'nodes' | 'plugins', name: string): TsUpPlugin {
  return {
    name: `node-red-${group}-package` as const,
    buildEnd() {
      const packageJsonPath = resolve(`./src/${group}/${name}/package.json`)
      const distGroup = group === 'nodes' ? 'nodes' : 'plugins'
      const outDir = resolve(`./dist/${distGroup}/${name}`)
      mkdirSync(outDir, { recursive: true })
      copyFileSync(packageJsonPath, resolve(outDir, 'package.json'))
    },
  }
}

function createLocalePlugin(group: 'nodes' | 'plugins', name: string): TsUpPlugin {
  return {
    name: 'node-red-locale',
    buildEnd() {
      const localesDir = resolve(`./src/${group}/${name}/locales`)
      if (existsSync(localesDir))
        copyDir(localesDir, resolve(`./dist/${group}/${name}/locales`))
    },
  }
}

function createRootPackageJSONPlugin(): TsUpPlugin {
  return {
    name: 'node-red-root-package',
    buildEnd() {
      const rootPkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'))
      const nodeNames = existsSync(resolve('./src/nodes')) ? readdirSync(resolve('./src/nodes')) : []
      const pluginNames = existsSync(resolve('./src/plugins')) ? readdirSync(resolve('./src/plugins')) : []

      const nodesEntries = nodeNames.reduce((acc, n) => {
        acc[n] = `nodes/${n}/${n}.js`
        return acc
      }, {} as Record<string, string>)
      const pluginsEntries = pluginNames.reduce((acc, n) => {
        acc[n] = `plugins/${n}/${n}.js`
        return acc
      }, {} as Record<string, string>)

      const outPkg = {
        'name': rootPkg.name || 'node-red-bundle',
        'version': rootPkg.version || '1.0.0',
        'description': rootPkg.description || '',
        'author': rootPkg.author || '',
        'keywords': rootPkg.keywords || [],
        'license': rootPkg.license || 'ISC',
        'node-red': {
          ...(Object.keys(nodesEntries).length ? { nodes: nodesEntries } : {}),
          ...(Object.keys(pluginsEntries).length ? { plugins: pluginsEntries } : {}),
        },
      }

      mkdirSync(resolve('./dist'), { recursive: true })
      writeFileSync(resolve('./dist/package.json'), JSON.stringify(outPkg, null, 2), 'utf-8')
    },
  }
}

function createNodeBundles(isWatchMode: boolean): Options[] {
  if (!existsSync(resolve('./src/nodes')))
    return []
  const names = readdirSync(resolve('./src/nodes'))
  return names.reduce((prev, name) => {
    const items: Options[] = [
      {
        name: `node-runtime-${name}`,
        platform: 'node',
        entry: { [name]: resolve(`./src/nodes/${name}/runtime/index.ts`) },
        outDir: resolve(`./dist/nodes/${name}`),
        format: ['cjs'],
        clean: false,
        splitting: true,
        cjsInterop: true,
        noExternal: [/.*/],
        publicDir: resolve(`./src/nodes/${name}/public`),

        watch: isWatchMode
          ? [
              `src/nodes/${name}/runtime/**/*`,
              `src/nodes/${name}/public/**/*`,
            ]
          : false,
        plugins: [createRootPackageJSONPlugin()],
      },
      {
        name: `node-client-${name}`,
        platform: 'browser',
        entry: { [name]: resolve(`./src/nodes/${name}/client/index.ts`) },
        outDir: resolve(`./dist/nodes/${name}`),
        format: ['iife'],
        clean: false,
        plugins: [
          createItemPackageJSONPlugin('nodes', name),
          createLocalePlugin('nodes', name),
          createRootPackageJSONPlugin(),
        ],
        esbuildPlugins: [mergeHTMLPlugin('nodes', name)],
        noExternal: [/.*/],
        outExtension: () => ({ js: '.html' }),
        watch: isWatchMode
          ? [
              `src/nodes/${name}/client/*.html`,
              `src/nodes/${name}/client/**/*`,
              `src/nodes/${name}/locales/**/*`,
            ]
          : false,
      },
    ]
    return [...prev, ...items]
  }, [] as Options[])
}

function createPluginBundles(isWatchMode: boolean): Options[] {
  if (!existsSync(resolve('./src/plugins')))
    return []
  const names = readdirSync(resolve('./src/plugins'))
  return names.reduce((prev, name) => {
    const items: Options[] = [
      {
        name: `plugin-runtime-${name}`,
        platform: 'node',
        entry: { [name]: resolve(`./src/plugins/${name}/runtime/index.ts`) },
        outDir: resolve(`./dist/plugins/${name}`),
        format: ['cjs'],
        clean: false,
        splitting: true,
        cjsInterop: true,
        noExternal: [/.*/],
        publicDir: resolve(`./src/plugins/${name}/public`),
        watch: isWatchMode
          ? [
              `src/plugins/${name}/runtime/**/*`,
              `src/plugins/${name}/public/**/*`,
            ]
          : false,
        plugins: [createRootPackageJSONPlugin()],
      },
      {
        name: `plugin-client-${name}`,
        platform: 'browser',
        entry: { [name]: resolve(`./src/plugins/${name}/client/index.ts`) },
        outDir: resolve(`./dist/plugins/${name}`),
        format: ['iife'],
        clean: false,
        plugins: [
          createItemPackageJSONPlugin('plugins', name),
          createLocalePlugin('plugins', name),
          createRootPackageJSONPlugin(),
        ],
        esbuildPlugins: [mergeHTMLPlugin('plugins', name)],
        noExternal: [/.*/],
        outExtension: () => ({ js: '.html' }),
        watch: isWatchMode
          ? [
              `src/plugins/${name}/client/*.html`,
              `src/plugins/${name}/client/**/*`,
              `src/plugins/${name}/locales/**/*`,
            ]
          : false,
      },
    ]
    return [...prev, ...items]
  }, [] as Options[])
}

export default defineConfig((overrideOptions) => {
  const isWatchMode = Boolean(overrideOptions.watch)
  return [
    ...createNodeBundles(isWatchMode),
    ...createPluginBundles(isWatchMode),
  ]
})
