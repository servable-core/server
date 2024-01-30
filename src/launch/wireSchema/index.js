import registerFeature from "./register/index.js"

export default async ({ schema, servableConfig }) => {
  const {
    features
  } = schema
  console.log("[Servable]", `Launch > Wire schema > Start`)
  await Promise.all(features.map(async feature => {
    await registerFeature({
      feature,
      servableConfig
    })
  }))
  console.log("[Servable]", `Launch > Wire schema > Success`)
}
