import featureCandidates from "./featureCandidates/index.js"
import handleFeature from './handleFeature/index.js'
import _ from 'underscore'

export default async ({ schema, configuration, operationProps }) => {

  const {
    features
  } = schema

  console.log("[Servable]", `Launch > Seed > Start >`)
  const candidates = _.flatten(await Promise.all(features.map(async feature =>
    featureCandidates({
      feature,
    })
  ))).filter(a => a)

  const cache = {}
  for (var i in candidates) {
    const feature = candidates[i]
    await handleFeature({
      operationProps,
      features: candidates,
      feature,
      cache,
      configuration
    })
  }

  console.log("[Servable]", `Launch > Seed > End`)
}
