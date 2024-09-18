import * as compose from 'docker-compose'
import YAML from 'yaml'
import adaptServices from './adaptServices/index.js'
import updateTargetCompose from './lib/updateTargetCompose.js'
import targetDockerPath from './lib/targetDockerPath.js'
import existingCompose from './lib/existingCompose.js'
import adaptForConsumption from './attachToProtocol/index.js'
import copyDataIfNeeded from './lib/copyDataIfNeeded.js'
import sanitizePath from 'path-sanitizer'
import serverSystem from './system/index.js'
import { sha256 } from 'js-sha256'

export default async ({
  protocol,
  servableConfig,
  engine
}) => {
  try {
    const projectName = sanitizePath(`${servableConfig.id}-${protocol.id}`).replaceAll('/', '-')
    const executionDockerComposePath = targetDockerPath({
      protocol
    })
    const executionDockerCompose = await existingCompose({ protocol })
    const declaredDockerComposeExists = await protocol.loader.systemDockerComposeExists()
    const declaredDockerComposeDirPath = protocol.loader.systemDockerComposeDirPath()
    let declaredDockerCompose = null

    if (declaredDockerComposeExists) {
      declaredDockerCompose = await compose.config({
        cwd: declaredDockerComposeDirPath,
      })
    }

    if (!declaredDockerCompose && !executionDockerCompose) {
      return adaptForConsumption({
        protocol,
        config: executionDockerCompose
      })
    }

    if (!declaredDockerCompose && executionDockerCompose) {
      try {
        await compose.stop({
          cwd: executionDockerComposePath,
          composeOptions: [
            ['--project-name', projectName],
            // ['--remove-orphans']
          ],
          callback: chunk => {
            console.log("[Servable]", `Docker compose down job in progres for ${protocol.id}: `, chunk.toString())
          }
        })
      } catch (e) {
        console.error(e)
      }
      return adaptForConsumption({
        protocol,
        config: executionDockerCompose
      })
    }

    // if (!(await shouldStart({
    //   protocol,
    //   executionDockerCompose,
    //   executionDockerComposePath
    // }))) {
    //   return adaptForConsumption({
    //     protocol,
    //     config: executionDockerCompose
    //   })
    // }

    let services = {}
    if (protocol.id === 'app') {
      const serverDocker = await compose.config({
        cwd: serverSystem.docker.path()
      })
      if (serverDocker) {
        services = serverDocker.data.config.services
        await serverSystem.docker.amendServices({
          services,
          servableConfig
        })
      }

      const engineDocker = await compose.config({
        cwd: engine.system.docker.path()
      })
      if (engineDocker) {
        Object.keys(engineDocker.data.config.services).forEach(key => {
          services[key] = engineDocker.data.config.services[key]
        })
        await engine.system.docker.amendServices({
          services,
          servableConfig
        })
      }
    }

    let protocolServices = declaredDockerCompose.data.config.services
      ? declaredDockerCompose.data.config.services
      : {}

    Object.keys(protocolServices).forEach(key => {
      services[key] = protocolServices[key]
    })


    // const networkName = projectName

    // let network
    // let networks = config.data.config.networks
    // if (networks && Object.keys(networks).length) {
    //     network = networks[Object.keys(networks)[0]]
    // }
    // if (network) {
    //     network = networks[0]
    // }

    declaredDockerCompose.data.config.services = await adaptServices({
      services,
      protocol,
      servableConfig
    })

    if (!declaredDockerCompose.data.config.services
      || !Object.keys(declaredDockerCompose.data.config.services).length) {
      try {
        await compose.down({
          cwd: executionDockerComposePath,
          composeOptions: [
            ['--project-name', projectName],
            // ['--remove-orphans']
          ],
          callback: chunk => {
            console.log("[Servable]", `Docker compose down job in progres for ${protocol.id}: `, chunk.toString())
          }
        })
      } catch (e) {
        console.error(e)
      }
      return adaptForConsumption({
        protocol,
        config: declaredDockerCompose.data.config
      })
    }

    const configAsString = YAML.stringify(declaredDockerCompose.data.config)
    const sha = sha256(configAsString)

    await updateTargetCompose({
      protocol,
      data: configAsString,
      sha
    })
    await copyDataIfNeeded({
      protocol,
    })

    await compose.upAll({
      cwd: executionDockerComposePath,
      composeOptions: [
        ['--project-name', projectName],
        // ['--remove-orphans']
      ],
      callback: chunk => {
        console.log("[Servable]", `Docker compose up job in progres for ${protocol.id}: `, chunk.toString())
      }
    })

    return adaptForConsumption({
      protocol,
      config: declaredDockerCompose.data.config
    })
  } catch (e) {
    console.error(e)
    throw (e)
  }
}
