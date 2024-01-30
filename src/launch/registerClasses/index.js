import registerFeature from "./registerFeature/index.js"

export default async ({ schema }) => {
  const {
    features
  } = schema
  console.log("[Servable]", `Launch > Register class > Start`)
  await Promise.all(features.map(async feature => {
    await registerFeature({
      feature,
      allFeatures: features,
    })
  }))
  console.log("[Servable]", `Launch > Register class > Success`)
}
