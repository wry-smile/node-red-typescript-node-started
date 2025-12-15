import type { EditorRED } from 'node-red'
import type { SimpleNodeClientNodeProperties } from './types'

declare const RED: EditorRED

RED.nodes.registerType<SimpleNodeClientNodeProperties>('simple-node', {
  category: 'function',
  color: '#a6bbcf',
  defaults: {
    name: { value: '' },
  },
  inputs: 1,
  outputs: 1,
  icon: 'file.png',
  paletteLabel: 'simple-node',
  label() {
    return this.name || 'simple-node'
  },
})
