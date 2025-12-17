import type { Options } from 'tsup'
import { filterPackageByConfig } from './config'
import { getFinalConfig } from './load-config'
import { checkCustomBuild, singleBuild, singleCustomBuild } from './single-build'

export async function generateTsupBuildOptions(): Promise<Options[]> {
  const options: Options[] = []

  const userConfig = await getFinalConfig()

  const roots = filterPackageByConfig(userConfig)

  for (const buildOption of roots) {
    const { configPath, exists } = checkCustomBuild(buildOption)
    if (exists) {
      await singleCustomBuild(configPath!, buildOption)
      continue
    }

    const buildOptions = singleBuild(buildOption, userConfig)

    options.push(buildOptions)
  }

  return options
}
