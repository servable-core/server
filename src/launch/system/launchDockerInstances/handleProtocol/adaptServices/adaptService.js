import updateVolumeDestination from './adaptVolume.js'
import adaptPort from './adaptPort.js'
import adaptEnvironmentVariable from './adaptEnvironmentVariable.js'

export default async ({
  protocol,
  service,
  key,
  servableConfig
}) => {

  let { volumes, ports, environment } = service
  if (volumes && volumes.length) {
    volumes = volumes.map(volume => {
      return updateVolumeDestination({
        protocol,
        volume,
        key
      })
    })
  }

  if (ports && ports.length) {
    ports = await Promise.all(ports.map(async port => {
      return adaptPort({
        protocol,
        port
      })
    }))
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

  return {
    ...service,
    volumes,
    ports,
    environment
  }
}
