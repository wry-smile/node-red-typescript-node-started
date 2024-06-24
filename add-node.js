module.exports = function (
  /** @type {import('plop').NodePlopAPI} */
  plop
) {
  plop.setGenerator('Add-Node', {
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Please enter the node name?'
      }
    ],
    actions: function (data) {
      return [
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/types/index.ts',
          templateFile: 'src/template/types/index.ts.hbs',
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/runtime/index.ts',
          templateFile: 'src/template/runtime/index.ts.hbs'
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/runtime/types.ts',
          templateFile: 'src/template/runtime/types.ts.hbs'
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/client/index.ts',
          templateFile: 'src/template/client/index.ts.hbs'
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/client/types.ts',
          templateFile: 'src/template/client/types.ts.hbs'
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/client/editor.html',
          templateFile: 'src/template/client/editor.html.hbs'
        },
        {
          type: 'add',
          path: 'src/nodes/{{ kebabCase name }}/client/help.html',
          templateFile: 'src/template/client/help.html.hbs'
        },
      ]
    }
  });
};
