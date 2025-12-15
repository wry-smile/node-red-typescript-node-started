# node-red-typescript-node-started

语言： [English](./README.en-US.md) | 简体中文

一个基于 TypeScript 的 Node-RED 节点与插件开发模板，提供脚手架、构建系统与国际化支持。

## 概述

这是一个用于开发 Node-RED 扩展（节点与插件）的项目模板。项目使用 TypeScript 编写，内置完整的工具链、开发流程与打包机制。

### 主要特性

- TypeScript 类型安全开发
- 使用 `pnpm scaffold` 快速生成节点/插件骨架
- 基于 tsup 的自动化构建（Node 运行时 + 浏览器编辑器）
- 内置国际化（i18n）
- 编辑器 UI（HTML）与帮助文档管线
- 开发模式下增量重建与监听
- 提供示例：simple-node 与 simple-plugin

## 快速开始

### 前置条件

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 创建节点

```bash
pnpm scaffold
```

根据提示：

1. 选择 Node
2. 输入节点名称（如：my-custom-node）
3. 选择语言（默认：en-US, zh-CN）

### 创建插件

```bash
pnpm scaffold
```

根据提示：

1. 选择 Plugin
2. 输入插件名称（如：my-custom-plugin）
3. 选择语言

## 项目结构

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

## 开发命令

- 构建全部节点与插件

```bash
pnpm build
```

- 开发模式（监听变更）

```bash
pnpm dev
```

- 运行脚手架

```bash
pnpm scaffold
```

## 节点结构指南

目录布局：

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

运行时示例：

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

编辑器示例：

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

## 插件结构指南

目录布局：

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

## 国际化（i18n）

脚手架支持以下语言：

- de
- en-US
- en-ES（西班牙语）
- fr
- ja
- ko
- pt-BR
- ru
- zh-CN
- zh-TW

帮助 HTML 示例（locales/{lang}/my-node.html）：

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

标签 JSON 示例（locales/{lang}/my-node.json）：

```json
{
  "my-node": {
    "label": "My Node",
    "description": "A custom Node-RED node"
  }
}
```

## 构建系统

使用 tsup，每个节点/插件生成两类产物：

- 运行时：CommonJS，输出到 `dist/nodes/<name>/<name>.js` 或 `dist/plugins/<name>/<name>.js`
- 编辑器端：IIFE HTML，输出到 `dist/.../<name>.html`（脚本 + 合并 HTML）

自动化：

- 将 HTML 合并进编辑器产物
- 复制 locales
- 生成根 `dist/package.json`，写入 `node-red.nodes` / `node-red.plugins` 条目

## 打包与发布

- 构建

```bash
pnpm build
```

- 发布到 npm

```bash
npm publish
```

- 作为归档分发

```bash
tar -czf node-red-bundle.tar.gz dist/
# 或
zip -r node-red-bundle.zip dist/
```

- 在 Node-RED 中安装
  - 来自 npm：`npm install <your-package>`
  - 本地目录：`npm install /path/to/dist`
  - 管理界面：Palette Manager → 搜索 → Install

## 常见问题（FAQ）

- 自定义图标

```ts
RED.nodes.registerType('my-node', {
  icon: 'font-awesome/fa-cube' // 或 'icons/my-icon.png'
})
```

- 配置端口数量

```ts
RED.nodes.registerType('my-node', { inputs: 1, outputs: 2 })
```

- 运行时访问配置

```ts
RED.nodes.createNode(this, config)
```

- 错误处理

```ts
this.on('input', (msg) => {
  try { /* ... */ }
  catch (e) { this.error(String(e), msg) }
})
```
