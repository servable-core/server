import * as compose from 'docker-compose'
import YAML from 'yaml'
import adaptServices from './adaptServices/index.js'
import shouldStart from './shouldStart.js'
import updateTargetCompose from './utils/updateTargetCompose.js'
import targetDockerPath from './utils/targetDockerPath.js'
import existingCompose from './utils/existingCompose.js'
import adaptForConsumption from './attachToFeature/index.js'
import copyDataIfNeeded from './utils/copyDataIfNeeded.js'
import sanitizePath from 'path-sanitizer'

export default async (props) => {
  const {
    item: feature,
    servableConfig
  } = props

  const existingDockerCompose = await existingCompose({ item: feature })
  if (!(await shouldStart({ item: feature, existingDockerCompose }))) {
    return adaptForConsumption({ item: feature, config: existingDockerCompose })
  }

  //#TODO: feature.loader
  const _path = feature.loader.systemDockerComposeDirPath()

  try {
    const config = await compose.config({
      cwd: _path,
    })

    let services = config.data.config.services

    const projectName = sanitizePath(`${servableConfig.id}-${feature.id}`).replaceAll('/', '-')
    // const networkName = projectName

    // let network
    // let networks = config.data.config.networks
    // if (networks && Object.keys(networks).length) {
    //     network = networks[Object.keys(networks)[0]]
    // }
    // if (network) {
    //     network = networks[0]
    // }

    config.data.config.services = await adaptServices({ services, item: feature })
    if (!config.data.config.services || !Object.keys(config.data.config.services).length) {
      return adaptForConsumption({ item: feature, config: config.data.config })
    }

    const configAsString = YAML.stringify(config.data.config)
    await updateTargetCompose({ item: feature, data: configAsString })
    await copyDataIfNeeded({ item: feature, })
    const targetPath = targetDockerPath({ feature: feature })

    await compose.upAll({
      cwd: targetPath,
      composeOptions: [
        ['--project-name', projectName],
        // ['--remove-orphans']
      ],
      callback: chunk => {
        console.log("[Servable]", `Docker compose up job in progres for ${feature.id}: `, chunk.toString())
      }
    })

    return adaptForConsumption({ item: feature, config: config.data.config })
  } catch (e) {
    console.error(e)
    throw (e)
  }

  return null
}
