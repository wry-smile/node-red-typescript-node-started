import type { BuildConfig } from './build/config.ts'

const config: BuildConfig = {
  kinds: ['nodes', 'plugins'],
  allow: {
    nodes: [
    ],
    plugins: [],
  },
  ignore: {
    nodes: [
    ],
    plugins: [
    ],
  },
  outDir: 'dist',
  output: {
    // type: 'flat',
    type: 'merge',
    // merge: {
    //   rootPackage: {
    //     name: 'node-red-merge',
    //   },
    // },
  },
}

export default config
