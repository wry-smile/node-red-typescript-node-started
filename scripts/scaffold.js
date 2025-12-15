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

const localizedLocales = Object.keys(languageMap).map((value) => {
  const name = languageMap[value] || value
  return { name, value }
})

module.exports = function (
  /** @type {import('plop').NodePlopAPI} */
  plop,
) {
  plop.setGenerator('Scaffold', {
    prompts: [
      {
        type: 'list',
        name: 'type',
        message: 'Please select what you want to add?',
        choices: [
          { name: 'Node', value: 'node' },
          { name: 'Plugin', value: 'plugin' },
        ],
      },
      {
        type: 'input',
        name: 'name',
        message: 'Please enter the {{ type }} name?',
      },
      {
        type: 'checkbox',
        name: 'locales',
        message: 'Please select internationalization configuration.',
        choices: localizedLocales,
        default: ['en-US', 'zh-CN'],
      },
    ],
    actions(data) {
      const { type, locales = [] } = data
      const templateDir = type === 'node' ? './template' : './template-plugin'
      const baseDir = type === 'node' ? '../src/nodes' : '../src/plugins'

      const baseActions = [
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
          {
            type: 'add',
            path: `${baseDir}/{{ kebabCase name }}/client/editor.html`,
            templateFile: `${templateDir}/client/editor.html.hbs`,
          },
        )
      }

      let localeActions = []
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
