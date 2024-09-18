import adaptService from './adaptService.js'

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
  const keys = Object.keys(services)
  await Promise.all(keys.map(async key => {
    const result = await adaptService({
      protocol,
      service: services[key],
      key,
      servableConfig
    })
    if (result) {
      services[key] = result
    } else {
      delete services[key]
    }
  }))

  return services
}
