#!/usr/bin/env node
import process from 'node:process'
import { Command } from 'commander'
import { buildEntry } from './build.js'
import { runGenerator } from './gen.js'

const program = new Command()

program
  .name('flowup')
  .description('CLI tool for building and generating code for Node-RED custom nodes.')
  .version('1.0.0')

program
  .command('build')
  .description('Build the runtime and client assets.')
  .action(async () => {
    try {
      console.log('Starting the build process...')
      await buildEntry()
    }
    catch (err) {
      console.error('Build failed:', err)
      process.exit(1)
    }
  })

program
  .command('gen')
  .description('Run the scaffold generator (plop).')
  .option('--outputDir <path>', 'Output directory relative to project root')
  .option('--type <type>', 'Type to generate (node or plugin)')
  .option('--name <name>', 'Name of the node or plugin')
  .option('--locales <locales>', 'Comma-separated list of locales (e.g., \'en-US,zh-CN\')')
  .action(async (options) => {
    try {
      // Pass the commander options object directly to the generator to bypass prompts.
      await runGenerator(options)
    }
    catch (err) {
      console.error('Generator failed:', err)
      process.exit(1)
    }
  })

program.parse(process.argv)
