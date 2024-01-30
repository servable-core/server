import handleFeature from "./handleFeature/index.js"

export default async ({ app, schema, configuration, server, servableConfig, frameworkBridge }) => {

  const {
    features
  } = schema
  console.log("[Servable]", `Launch > After init > Start`)
  await Promise.all(features.map(async feature => {
    await handleFeature({
      app,
      schema,
      configuration,
      server,
      servableConfig,
      frameworkBridge,
      feature,
      allFeatures: features
    })
  }))
  console.log("[Servable]", `Launch > After init > Success`)
}
