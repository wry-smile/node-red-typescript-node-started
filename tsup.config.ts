import { defineConfig } from 'tsup'
import { generateTsupBuildOptions } from './build/tsup-build'

export default defineConfig(async () => generateTsupBuildOptions())
