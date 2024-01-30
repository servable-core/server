import adaptConfig from "../../lib/adaptConfig/index.js"
import adaptSystemPayloads from "./adaptPayloads/index.js"
import launchDocker from "./launchDocker/index.js"

export default async ({ schema, servableConfig, frameworkBridge }) => {
  const dockerSystems = await launchDocker({ schema, servableConfig })
  // return [...dockerSystems]

  await adaptSystemPayloads({ schema, servableConfig })
  let payload = {}
  const appSystem = schema.appFeature.system
  if (appSystem) {
    payload = appSystem.payload
  }

  adaptConfig({
    servableConfig,
    payload,
    live: true,
    frameworkBridge
  })
}
