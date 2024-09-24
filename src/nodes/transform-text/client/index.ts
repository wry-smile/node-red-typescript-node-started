import type { EditorRED } from 'node-red'
import type { TransformTextClientNodeProperties } from './types'

declare const RED: EditorRED

RED.nodes.registerType<TransformTextClientNodeProperties>('transform-text', {
  category: 'function',
  color: '#a6bbcf',
  defaults: {
    name: { value: '' },
  },
  inputs: 1,
  outputs: 1,
  icon: 'file.png',
  paletteLabel: 'transform-text',
  label() {
    return this.name || 'transform-text'
  },
})
