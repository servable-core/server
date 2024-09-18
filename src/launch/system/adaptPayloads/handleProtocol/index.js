import adaptDocker from './docker/index.js'

export default async ({
  protocol,
  servableConfig,
  schema,
  engine
}) => {

  const { system } = protocol
  if (!system) {
    return
  }

  const { docker } = system
  if (docker) {
    await adaptDocker({
      protocol,
      schema,
      servableConfig,
      engine
    })
  }
}
