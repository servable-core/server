import updateVolumeDestination from './adaptVolume.js'
import adaptEnvironmentVariable from './adaptEnvironmentVariable.js'
import adaptHealthcheck from './adaptHealthcheck.js'
import adaptContainerName from './adaptContainerName.js'
// import adaptCommand from './adaptCommand.js'
import _ from 'underscore'

export default async ({
  protocol,
  service,
  key,
  servableConfig,
  networkName
}) => {
  const customEnvs = service['x-servable-envs']
  if (customEnvs && customEnvs.length) {
    const ports = service.ports
    if (ports && ports.length) {
      let count = ports.length
      for (const customEnv of customEnvs) {
        const key = Object.keys(customEnv)[0]
        const processEnvExists = process.env[key] !== undefined
        if (processEnvExists) {
          count--
        }
      }

      if (count === 0) {
        return null
      }
    }
  }

  let { volumes, environment, command, healthcheck, container_name: containerName } = service
  containerName = adaptContainerName({ containerName, servableConfig })

  if (healthcheck) {
    healthcheck = await adaptHealthcheck({
      healthcheck,
      servableConfig
    })
  }

  if (volumes && volumes.length) {
    volumes = volumes.map(volume => {
      return updateVolumeDestination({
        protocol,
        volume,
        key
      })
    })
  }

  if (environment && Object.keys(environment).length) {
    for (const variableKey of Object.keys(environment)) {
      const value = await adaptEnvironmentVariable({
        protocol,
        variableKey,
        variableValue: environment[variableKey],
        servableConfig
      })
      environment[variableKey] = value
    }
  }

  // if (command) {
  //   const commandArray = _.isArray(command)
  //     ? command
  //     : [command]

  //   command = []
  //   for (const _command of commandArray) {
  //     const value = await adaptCommand({
  //       protocol,
  //       value: _command,
  //       servableConfig
  //     })

  //     command.push(value)
  //   }
  // }

  return {
    ...service,
    volumes,
    environment,
    healthcheck,
    ...(containerName ? { container_name: containerName } : {}),
    // command,
    networks: [networkName]
  }
}
