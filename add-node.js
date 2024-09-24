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
  plop.setGenerator('Add-Node', {
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Please enter the node name?',
      },
      {
        type: 'checkbox',
        name: 'locales',
        message: 'Please select node internationalization configuration.',
        choices: localizedLocales,
        default: ['en-US', 'zh-CN'],
      },
    ],
    actions(data) {
      const { locales = [] } = data

      return [
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/types/index.ts',
          templateFile: 'src/template/types/index.ts.hbs',
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/runtime/index.ts',
          templateFile: 'src/template/runtime/index.ts.hbs',
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/runtime/types.ts',
          templateFile: 'src/template/runtime/types.ts.hbs',
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/client/index.ts',
          templateFile: 'src/template/client/index.ts.hbs',
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/client/types.ts',
          templateFile: 'src/template/client/types.ts.hbs',
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/client/editor.html',
          templateFile: 'src/template/client/editor.html.hbs',
        },
        ...locales.map((key) => {
          return {
            type: 'add',
            path: `src/nodes/{{ kebabCase name }}/locales/${key}/{{ kebabCase name }}.html`,
            templateFile: 'src/template/locales/index.html.hbs',
          }
        }),
        ...locales.map((key) => {
          return {
            type: 'add',
            path: `src/nodes/{{ kebabCase name }}/locales/${key}/{{ kebabCase name }}.json`,
            templateFile: 'src/template/locales/index.json',
          }
        }),
      ]
    },
  })
}
