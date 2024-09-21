import adaptService from './adaptService.js'
import adaptEnvironmentVariable from './adaptEnvironmentVariable.js'

export default async ({
  protocol,
  services,
  servableConfig
}) => {

  // Object.keys(services).forEach(key => {
  //     let service = services[key]
  if (!services) {
    return services
  }
  let keys = Object.keys(services)
  for (const key of keys) {
    const service = services[key]
    if (service['x-servable-disabled']) {
      delete services[key]
      return
    }
  }

  keys = Object.keys(services)
  let allPorts = []
  for (const key of keys) {
    const service = services[key]
    const result = await adaptService({
      protocol,
      service,
      key,
      servableConfig,
      allPorts,
      serviceName: key
    })

    if (result) {
      services[key] = result
    } else {
      delete services[key]
    }
  }


  const computedPortsEnvs = {}
  for (const port of allPorts) {
    computedPortsEnvs[`${port.serviceName}_${port.requestedPublished}`] = port.published
  }

  for (const key of keys) {
    const service = services[key]
    let { environment } = service

    if (environment && Object.keys(environment).length) {
      for (const variableKey of Object.keys(environment)) {
        const value = await adaptEnvironmentVariable({
          protocol,
          variableKey,
          variableValue: environment[variableKey],
          computedPortsEnvs,
          servableConfig
        })
        environment[variableKey] = value
      }
    }

    services[key] = { ...service, environment }
  }

  return services
}
