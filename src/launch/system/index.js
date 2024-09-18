import adaptSystemPayloads from "./adaptPayloads/index.js"
import launchDockerInstances from "./launchDockerInstances/index.js"

export default async ({
  schema,
  servableConfig,
  engine
}) => {
  const dockerSystems = await launchDockerInstances({
    schema,
    servableConfig,
    engine
  })

  await adaptSystemPayloads({
    schema,
    servableConfig,
    engine
  })

  const appSystem = schema.appProtocol.system ? schema.appProtocol.system : {}
  const { payload = {} } = appSystem

  servableConfig.envs = {
    ...servableConfig.envs,
    ...payload
  }
}
