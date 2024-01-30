import handleFeature from "./handleFeature/index.js"
import canStart from "./canStart.js"

export default async ({ schema, servableConfig }) => {

  const {
    features,
    appFeature,
  } = schema

  if (!servableConfig.system.docker.environments.includes(process.env.NODE_ENV)) {
    return null
  }

  if (!(await canStart())) {
    console.warn(`Can't launch docker engines.`)
    return
  }

  const items = await Promise.all(features.map(async item => {
    return handleFeature({
      schema,
      servableConfig,
      item,
      allFeatures: features,
      appFeature
    })
  }))

  return items.filter(a => a)
}
