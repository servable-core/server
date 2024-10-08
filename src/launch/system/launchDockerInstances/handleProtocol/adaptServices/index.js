import adaptService from './adaptService.js'

export default async ({
  protocol,
  services,
  servableConfig,
  networkName
}) => {

  // Object.keys(services).forEach(key => {
  //     let service = services[key]
  if (!services) {
    return services
  }
  const keys = Object.keys(services)
  await Promise.all(keys.map(async key => {
    const service = services[key]
    if (service['x-servable-disabled']) {
      delete services[key]
      return
    }

    const result = await adaptService({
      protocol,
      service: services[key],
      key,
      servableConfig,
      networkName
    })
    if (result) {
      services[key] = result
    } else {
      delete services[key]
    }
  }))

  return services
}
