import * as compose from 'docker-compose'
import YAML from 'yaml'
import adaptServices from './adaptServices/index.js'
import adaptServicesPorts from './adaptServicesPorts/index.js'
import updateTargetCompose from './lib/updateTargetCompose.js'
import targetDockerPath from './lib/targetDockerPath.js'
import existingCompose from './lib/existingCompose.js'
import adaptForConsumption from './attachToProtocol/index.js'
import copyDataIfNeeded from './lib/copyDataIfNeeded.js'
import sanitizePath from 'path-sanitizer'
import serverSystem from './system/server/index.js'
import appDefaultSystem from './system/app/index.js'
import { sha256, } from 'js-sha256'



export default async ({
  protocol,
  servableConfig,
  engine
}) => {
  try {
    const projectName = sanitizePath(`${servableConfig.id}-${protocol.id}`).replaceAll('/', '-').toLowerCase()
    const executionDockerComposePath = targetDockerPath({
      protocol
    })
    const executionDockerCompose = await existingCompose({ protocol })
    let declaredDockerComposeExists = await protocol.loader.systemDockerComposeExists()
    let declaredDockerComposeDirPath = protocol.loader.systemDockerComposeDirPath()
    let declaredDockerCompose = null

    if (!declaredDockerComposeExists
      && (protocol.id === 'app')) {
      declaredDockerComposeDirPath = appDefaultSystem.docker.path()
      declaredDockerComposeExists = true
    }

    if (declaredDockerComposeExists) {
      declaredDockerCompose = await compose.config({
        cwd: declaredDockerComposeDirPath,
      })
    }

    if (declaredDockerCompose
      && (protocol.id === 'app')
      && declaredDockerCompose.data.config['x-servable-disabled']
    ) {
      declaredDockerComposeDirPath = appDefaultSystem.docker.path()
      declaredDockerCompose = await compose.config({
        cwd: declaredDockerComposeDirPath,
      })
    }

    if (!declaredDockerCompose
      && !executionDockerCompose) {
      return adaptForConsumption({
        protocol,
        config: executionDockerCompose
      })
    }

    const stopExecution = async () => {
      try {
        await compose.stop({
          cwd: executionDockerComposePath,
          composeOptions: [
            ['--project-name', projectName],
            // TODO: stop orphans['--remove-orphans']
          ],
          callback: chunk => {
            Servable.Console.log("[Servable]", `Docker compose down job in progres for ${protocol.id}: `, chunk.toString())
          }
        })

        return true
      } catch (e) {
        Servable.Console.error(e)
        return false
      }
    }

    if (!declaredDockerCompose
      && executionDockerCompose) {
      await stopExecution()
      return adaptForConsumption({
        protocol,
        config: executionDockerCompose
      })
    }

    if (declaredDockerCompose
      && declaredDockerCompose.data.config['x-servable-disabled']) {
      await stopExecution()
      return adaptForConsumption({
        protocol,
        config: executionDockerCompose
      })
    }



    let services = {}
    if (protocol.id === 'app') {
      const serverDocker = await compose.config({
        cwd: serverSystem.docker.path()
      })

      if (serverDocker) {
        services = serverDocker.data.config.services
      }

      const engineDocker = await compose.config({
        cwd: engine.system.docker.path()
      })

      if (engineDocker) {
        Object.keys(engineDocker.data.config.services).forEach(key => {
          services[key] = engineDocker.data.config.services[key]
        })
      }
    }

    const protocolServices = declaredDockerCompose.data.config.services
      ? declaredDockerCompose.data.config.services
      : {}

    Object.keys(protocolServices).forEach(key => {
      services[key] = protocolServices[key]
    })

    declaredDockerCompose.data.config.version = '3.8'
    declaredDockerCompose.data.config.name = projectName
    declaredDockerCompose.data.config.networks = { [projectName]: { driver: 'bridge' } }
    declaredDockerCompose.data.config.services = await adaptServices({
      services,
      protocol,
      servableConfig,
      networkName: projectName
    })

    if (!declaredDockerCompose.data.config.services
      || !Object.keys(declaredDockerCompose.data.config.services).length) {
      await stopExecution()
      return adaptForConsumption({
        protocol,
        config: declaredDockerCompose.data.config
      })
    }

    const declaredFingerprint = sha256(YAML.stringify(declaredDockerCompose.data.config))
    let shouldUpAll = false
    if (executionDockerCompose) {
      const existingFingerprint = executionDockerCompose['x-servable-fingerprint']
      if (declaredFingerprint
        !== existingFingerprint) {
        await stopExecution()
        shouldUpAll = true
      }
    }
    else {
      shouldUpAll = true
    }

    if (shouldUpAll) {
      // declaredDockerCompose.data.config.version = "3.7"
      declaredDockerCompose.data.config.services = await adaptServicesPorts({
        services,
        protocol,
        servableConfig
      })
      declaredDockerCompose.data.config['x-servable-fingerprint'] = declaredFingerprint
      await updateTargetCompose({
        protocol,
        data: YAML.stringify(declaredDockerCompose.data.config),
      })
      await copyDataIfNeeded({
        protocol,
      })

      await compose.upAll({
        cwd: executionDockerComposePath,
        composeOptions: [
          ['--project-name', projectName],
          // TODO: stop orphans['--remove-orphans']
        ],
        callback: chunk => {
          Servable.Console.log("[Servable]", `Docker compose up job in progres for ${protocol.id}: `, chunk.toString())
        }
      })
    }

    if (declaredDockerCompose.data.config.services) {
      for (const serviceKey of Object.keys(declaredDockerCompose.data.config.services)) {
        const service = declaredDockerCompose.data.config.services[serviceKey]
        const ports = service.ports
        if (!ports || !ports.length) {
          continue
        }

        const customEnvs = service['x-servable-envs']
        if (!customEnvs || !customEnvs.length) {
          continue
        }

        for (const customEnv of customEnvs) {
          const key = Object.keys(customEnv)[0]
          const value = parseInt(Object.values(customEnv)[0])
          const port = ports.find(p => p.target === value)
          if (!port) {
            continue
          }
          const uri = `localhost:${port.published}`
          process.env[key] = uri
        }
      }
    }


    return adaptForConsumption({
      protocol,
      config: declaredDockerCompose.data.config
    })
  } catch (e) {
    Servable.Console.error(e)
    throw (e)
  }
}
