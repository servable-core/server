import adaptService from './adaptService.js'

export default async (props) => {
  const {
    item,
    services
  } = props

  // Object.keys(services).forEach(key => {
  //     let service = services[key]
  const keys = Object.keys(services)
  await Promise.all(keys.map(async key => {
    services[key] = await adaptService({ item, service: services[key] })
  }))
  return services
}
