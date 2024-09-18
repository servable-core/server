import adaptService from './adaptService.js'

export default async ({
  protocol,
  services,
  servableConfig
}) => {

  // Object.keys(services).forEach(key => {
  //     let service = services[key]
  const keys = Object.keys(services)
  await Promise.all(keys.map(async key => {
    services[key] = await adaptService({
      protocol,
      service: services[key],
      key,
      servableConfig
    })
  }))

  return services
}
