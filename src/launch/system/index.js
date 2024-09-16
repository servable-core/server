import adaptConfig from "../../lib/adaptConfig/index.js"
import adaptSystemPayloads from "./adaptPayloads/index.js"
import launchDockerInstances from "./launchDockerInstances/index.js"

export default async ({ schema, servableConfig, engine }) => {
  const dockerSystems = await launchDockerInstances({
    schema,
    servableConfig
  })

  await adaptSystemPayloads({ schema, servableConfig })
  let payload = {}
  const appSystem = schema.appProtocol.system
  if (appSystem) {
    payload = appSystem.payload
  }

  adaptConfig({
    servableConfig,
    payload,
    live: true,
    engine
  })
}
