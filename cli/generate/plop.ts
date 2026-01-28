import type { Actions, NodePlopAPI } from 'plop'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const languageMap = {
  'de': 'German',
  'en-US': 'English (US)',
  'en-ES': 'Spanish',
  'fr': 'French',
  'ja': 'Japanese',
  'ko': 'Korean',
  'pt-BR': 'Portuguese (Brazil)',
  'ru': 'Russian',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
}

function getEnv(key: string) {
  return process.env[`FLOWUP_GEN_${key.toUpperCase()}`]
}

const __dirname = dirname(fileURLToPath(import.meta.url))

const localizedLocales = Object.keys(languageMap).map((value) => {
  const name = languageMap[value as keyof typeof languageMap] || value
  return { name, value }
})

export default async function (plop: NodePlopAPI) {
  const outputDir = getEnv('outputDir')
  const type = getEnv('type')
  const name = getEnv('name')
  const locales = getEnv('locales')
    ?.split(',')
    .map(locale => locale.trim())
    .filter(locale => locale !== '') || []

  plop.setGenerator('Scaffold', {
    prompts: [
      {
        type: 'input',
        name: 'outputDir',
        message: 'Please enter output directory (relative to project root, optional)?',
        default: outputDir || '.',
      },
      {
        type: 'list',
        name: 'type',
        message: 'Please select what you want to add?',
        choices: [
          { name: 'Node', value: 'node' },
          { name: 'Plugin', value: 'plugin' },
        ],
        default: type || 'node',
      },
      {
        type: 'input',
        name: 'name',
        message: 'Please enter the {{ type }} name?',
        default: name || '',
      },
      {
        type: 'checkbox',
        name: 'locales',
        message: 'Please select internationalization configuration.',
        choices: localizedLocales,
        default: locales.length > 0 ? locales : ['en-US', 'zh-CN'],
      },
    ],
    actions(data) {
      const {
        type,
        locales = [],
        outputDir = '.',
      } = data as { type: 'node' | 'plugin', locales: string[], outputDir?: string }

      const templateDir = type === 'node' ? resolve(__dirname, './template') : resolve(__dirname, './template-plugin')
      const baseDir = resolve(process.cwd(), outputDir).replace(/\\/g, '/')

      const baseActions = [
        {
          type: 'add',
          path: `${baseDir}/{{ kebabCase name }}/client/editor.html`,
          templateFile: `${templateDir}/client/editor.html.hbs`,
        },
        {
          type: 'add',
          path: `${baseDir}/{{ kebabCase name }}/types/index.ts`,
          templateFile: `${templateDir}/types/index.ts.hbs`,
        },
        {
          type: 'add',
          path: `${baseDir}/{{ kebabCase name }}/runtime/index.ts`,
          templateFile: `${templateDir}/runtime/index.ts.hbs`,
        },
        {
          type: 'add',
          path: `${baseDir}/{{ kebabCase name }}/client/index.ts`,
          templateFile: `${templateDir}/client/index.ts.hbs`,
        },
        {
          type: 'add',
          path: `${baseDir}/{{ kebabCase name }}/package.json`,
          templateFile: `${templateDir}/package.json.hbs`,
        },
        {
          type: 'add',
          path: `${baseDir}/{{ kebabCase name }}/vite.config.ts`,
          templateFile: `${templateDir}/vite.config.ts.hbs`,
        },
      ]

      if (type === 'node') {
        baseActions.push(
          {
            type: 'add',
            path: `${baseDir}/{{ kebabCase name }}/runtime/types.ts`,
            templateFile: `${templateDir}/runtime/types.ts.hbs`,
          },
          {
            type: 'add',
            path: `${baseDir}/{{ kebabCase name }}/client/types.ts`,
            templateFile: `${templateDir}/client/types.ts.hbs`,
          },
        )
      }

      let localeActions: Actions = []
      if (type === 'node') {
        localeActions = [
          ...locales.map(key => ({
            type: 'add',
            path: `${baseDir}/{{ kebabCase name }}/locales/${key}/{{ kebabCase name }}.html`,
            templateFile: `${templateDir}/locales/index.html.hbs`,
          })),
          ...locales.map(key => ({
            type: 'add',
            path: `${baseDir}/{{ kebabCase name }}/locales/${key}/{{ kebabCase name }}.json`,
            templateFile: `${templateDir}/locales/index.json`,
          })),
        ]
      }
      else {
        localeActions = [
          ...locales.map(key => ({
            type: 'add',
            path: `${baseDir}/{{ kebabCase name }}/locales/${key}/{{ kebabCase name }}.json`,
            templateFile: `${templateDir}/locales/index.json`,
          })),
        ]
      }

      return [...baseActions, ...localeActions]
    },
  })
}
