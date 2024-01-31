import handleFeature from "./handleFeature/index.js"

export default async ({
  app,
  schema,
  configuration,
  server,
  servableConfig,
  engine }) => {

  const {
    features
  } = schema
  console.log("[Servable]", `Launch > Before init > Start`)
  await Promise.all(features.map(async feature => {
    await handleFeature({
      app,
      schema,
      configuration,
      server,
      servableConfig,
      engine,
      feature,
      allFeatures: features
    })
  }))
  console.log("[Servable]", `Launch > Before init > Success`)
}
