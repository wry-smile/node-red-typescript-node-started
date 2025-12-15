# node-red-typescript-node-started

Languages: English | [简体中文](./README.zh-CN.md)

A modern TypeScript-based framework for developing Node-RED nodes and plugins, featuring a complete scaffolding tool, build system, and internationalization support.

## Overview

This is a Node-RED extension development template written in TypeScript. It supports creating custom Nodes and Plugins, and ships with a complete toolchain, development workflow, and packaging system.

### Key Features

- ✨ TypeScript support for a fully type-safe development experience
- 🚀 Scaffolding with `pnpm scaffold` to quickly create nodes and plugins
- 📦 Automated build powered by tsup (Node runtime + Browser editor)
- 🌍 Internationalization (i18n) built-in
- 🎨 Editor UI (HTML) and help docs pipeline ready
- 🔄 Dev watch mode for rapid feedback
- 📚 Complete examples: simple-node and simple-plugin

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Install Dependencies

```bash
pnpm install
```

### Create a New Node

```bash
pnpm scaffold
```

Follow the prompts:

1. Select Node
2. Enter the node name (e.g., my-custom-node)
3. Select i18n languages (default: en-US, zh-CN)

### Create a New Plugin

```bash
pnpm scaffold
```

Follow the prompts:

1. Select Plugin
2. Enter the plugin name (e.g., my-custom-plugin)
3. Select i18n languages

## Project Structure

```
node-red-typescript-node-started/
├── src/
│   ├── nodes/
│   │   └── simple-node/
│   │       ├── client/
│   │       │   ├── index.ts
│   │       │   ├── types.ts
│   │       │   └── editor.html
│   │       ├── runtime/
│   │       │   ├── index.ts
│   │       │   └── types.ts
│   │       ├── types/
│   │       │   └── index.ts
│   │       ├── locales/
│   │       │   ├── en-US/
│   │       │   └── zh-CN/
│   │       └── package.json
│   └── plugins/
│       └── simple-plugin/
│           ├── client/
│           ├── runtime/
│           ├── types/
│           ├── locales/
│           └── package.json
│
├── dist/
│   ├── nodes/
│   ├── plugins/
│   └── package.json
│
├── scripts/
│   ├── scaffold.js
│   ├── template/
│   └── template-plugin/
│
├── types/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── eslint.config.mjs
```

## Development Commands

- Build all nodes and plugins

```bash
pnpm build
```

- Watch mode (rebuild on change)

```bash
pnpm dev
```

- Scaffold a node or plugin

```bash
pnpm scaffold
```

## Node Structure Guide

Directory layout for a node:

```
my-node/
├── client/
│   ├── index.ts
│   ├── types.ts
│   └── editor.html
├── runtime/
│   ├── index.ts
│   └── types.ts
├── types/
│   └── index.ts
├── locales/
│   ├── en-US/
│   │   ├── my-node.html
│   │   └── my-node.json
│   └── zh-CN/
│       ├── my-node.html
│       └── my-node.json
└── package.json
```

Example runtime implementation:

```ts
// src/nodes/my-node/runtime/index.ts
import type { Node, NodeAPI } from 'node-red'

module.exports = function (RED: NodeAPI) {
  class MyNode implements Node {
    constructor(config: any) {
      RED.nodes.createNode(this, config)
      this.on('input', (msg: any) => {
        msg.payload = `Processed: ${msg.payload}`
        this.send(msg)
      })
    }
  }
  RED.nodes.registerType('my-node', MyNode)
}
```

Example editor implementation:

```ts
// src/nodes/my-node/client/index.ts
RED.nodes.registerType('my-node', {
  category: 'function',
  color: '#87CEEB',
  defaults: { name: { value: '' } },
  inputs: 1,
  outputs: 1,
  icon: 'font-awesome/fa-cube',
  label() { return this.name || 'my-node' },
})
```

## Plugin Structure Guide

Directory layout for a plugin:

```
my-plugin/
├── client/
│   └── index.ts
├── runtime/
│   ├── index.ts
│   └── types.ts
├── types/
│   └── index.ts
├── locales/
│   ├── en-US/
│   │   └── my-plugin.json
│   └── zh-CN/
│       └── my-plugin.json
└── package.json
```

## Internationalization (i18n)

Scaffolded languages supported by the script:

- de
- en-US
- en-ES (Spanish)
- fr
- ja
- ko
- pt-BR
- ru
- zh-CN
- zh-TW

Example help HTML (locales/{lang}/my-node.html):

```html
<script type="text/html" data-help-name="my-node">
  <p>My node description</p>
  <h3>Inputs</h3>
  <dl class="message-properties">
    <dt>payload <span class="property-type">any</span></dt>
    <dd>The input message payload</dd>
  </dl>
  <h3>Outputs</h3>
  <dl class="message-properties">
    <dt>payload <span class="property-type">any</span></dt>
    <dd>The processed message payload</dd>
  </dl>
</script>
```

Example labels JSON (locales/{lang}/my-node.json):

```json
{
  "my-node": {
    "label": "My Node",
    "description": "A custom Node-RED node"
  }
}
```

## Build System

Powered by tsup with two bundles per item:

- Node runtime: CommonJS output under `dist/nodes/<name>/<name>.js` or `dist/plugins/<name>/<name>.js`
- Editor client: IIFE HTML bundle under `dist/.../<name>.html` (script + merged HTML)

Automation:

- HTML merging into the editor bundle
- Copy locales
- Generate root `dist/package.json` with `node-red.nodes` / `node-red.plugins` entries

## Packaging & Publishing

- Build

```bash
pnpm build
```

- Publish to npm

```bash
npm publish
```

- Ship as archive

```bash
tar -czf node-red-bundle.tar.gz dist/
# or
zip -r node-red-bundle.zip dist/
```

- Install into Node-RED
  - From npm: `npm install <your-package>`
  - From local: `npm install /path/to/dist`
  - From UI: Palette Manager → search → Install

## FAQ

- Customize icon

```ts
RED.nodes.registerType('my-node', {
  icon: 'font-awesome/fa-cube' // or 'icons/my-icon.png'
})
```

- Configure ports

```ts
RED.nodes.registerType('my-node', { inputs: 1, outputs: 2 })
```

- Access config at runtime

```ts
RED.nodes.createNode(this, config)
```

- Error handling

```ts
this.on('input', (msg) => {
  try { /* ... */ }
  catch (e) { this.error(String(e), msg) }
})
```

---

Last Updated: 2025-12-15
