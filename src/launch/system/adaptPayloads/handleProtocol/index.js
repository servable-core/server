import adaptDocker from './docker/index.js'

export default async ({
  protocol,
  servableConfig,
  schema,
  engine
}) => {

  if (!protocol.system) {
    protocol.system = {}
  }

  const { system } = protocol
  const { docker } = system
  if (!docker) {
    return
  }

  await adaptDocker({
    protocol,
    schema,
    servableConfig,
    engine
  })
}
