import handleFeature from "./handleFeature/index.js"

export default async (props) => {
  const { schema, servableConfig } = props
  const {
    features,
    appFeature,
  } = schema

  const items = await Promise.all(features.map(async item => {
    return handleFeature({
      ...props,
      item,
      allFeatures: features,
      appFeature
    })
  }))
}
