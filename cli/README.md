# Flowup CLI

## Overview

`flowup` is a command-line interface (CLI) tool designed to streamline the development of custom nodes and plugins for Node-RED within this monorepo. It provides commands for building assets and scaffolding new components.

## Usage

The CLI is intended to be used via `pnpm` scripts from the root of the monorepo.

```bash
# Example of running a command via pnpm
pnpm flowup <command> [options]
```

Alternatively, you can define scripts in your `package.json` for convenience.

## Commands

### `build`

This command compiles the TypeScript source code for both the runtime (backend) and the client (editor panel) and prepares them for use in Node-RED.

**Usage:**

```bash
pnpm flowup build
```

This will generate the necessary JavaScript and HTML files in the `dist` directory.

---

### `gen`

This command launches an interactive generator (using Plop) to scaffold the boilerplate for a new Node-RED node or plugin. It helps ensure consistency and reduces manual setup.

#### Interactive Mode

To run the generator in interactive mode, where it will ask you a series of questions, simply run the command without any arguments:

**Usage:**

```bash
pnpm flowup gen
```

#### With Arguments

You can also provide arguments directly on the command line to pre-fill the answers and bypass the interactive prompts. This is useful for scripting and automation.

**Example:**

```bash
# Generate a new node named 'my-special-node' in the 'packages/nodes' directory
pnpm flowup gen --name my-special-node --type node --outputDir ./packages/nodes
```

# Example of package.json

```json
{
  "scripts": {
    "gen:nodes": "flowup gen --outputDir ./packages/nodes --type node",
    "gen:plugin": "flowup gen --outputDir ./packages/plugins --type plugin"
  }
}
```

#### Available Arguments

- `--outputDir <path>`
  - **Description**: The output directory for the generated files, relative to the project root.
  - **Default**: `.` (the current directory)

- `--type <type>`
  - **Description**: The type of component to generate.
  - **Options**: `node`, `plugin`

- `--name <name>`
  - **Description**: The name of the node or plugin (e.g., `my-node`).

- `--locales <locales>`
  - **Description**: A comma-separated list of locales to generate for internationalization.
  - **Default**: `en-US,zh-CN`
  - **Example**: `--locales en-US,de,fr`
