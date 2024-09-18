import adaptPort from './adaptPort.js'

export default async ({
  protocol,
  service,
  key,
  servableConfig
}) => {
  let { ports } = service

  if (ports && ports.length) {
    ports = await Promise.all(ports.map(async port => {
      return adaptPort({
        protocol,
        port
      })
    }))
  }

  return {
    ...service,
    ports,
  }
}
