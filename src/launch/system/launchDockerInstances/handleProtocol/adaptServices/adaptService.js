import updateVolumeDestination from './adaptVolume.js'
// import adaptPort from './adaptPort.js'
import adaptEnvironmentVariable from './adaptEnvironmentVariable.js'

export default async ({
  protocol,
  service,
  key,
  servableConfig
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

  // if (ports && ports.length) {
  //   ports = await Promise.all(ports.map(async port => {
  //     return adaptPort({
  //       protocol,
  //       port
  //     })
  //   }))
  // }

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
    // ports,
    environment
  }
}
