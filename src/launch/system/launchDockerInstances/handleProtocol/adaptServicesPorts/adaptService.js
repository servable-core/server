import adaptPort from './adaptPort.js'


export default async ({
  protocol,
  service,
  key,
  servableConfig,
  allPorts,
  serviceName
}) => {
  let { ports = [], environment } = service

  if (ports.length) {
    ports = await Promise.all(ports.map(async port => {
      return adaptPort({
        protocol,
        port
      })
    }))
  }

  for (const port of ports) {
    allPorts.push({
      ...port,
      serviceName
    })
  }

  ports = ports.map(p => {
    delete p.requestedPublished
    return p
  })

  return {
    ...service,
    ports,
  }
}
