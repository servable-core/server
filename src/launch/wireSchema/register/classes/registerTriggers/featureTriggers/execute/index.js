import performClassFeature from './performClassFeature.js'
import adaptFeaturePayload from '../../../../../../utils/adaptFeaturePayload.js'

export default async ({
  allFeatures,
  feature,
  request,
  operationName,
  featureInstance,
}) => {

  const { object } = request
  // if (request.object.disposableOrphans) {
  //     const dd = object.disposableOrphans()
  //     console.log("[Servable]", dd)
  // }

  if (!object) {
    return
  }

  const { className } = object
  let classFeatures = await feature.loader.classFeatures({ className })
  if (!classFeatures || !classFeatures.length) {
    return
  }

  classFeatures = classFeatures.map(adaptFeaturePayload)

  // const items = object.constructor.features
  //     ? object.constructor.features.map(adaptFeaturePayload)
  //     : []

  const cache = {}
  for (var i in classFeatures) {
    const classFeature = classFeatures[i]
    await performClassFeature({
      allFeatures,
      feature,
      featureInstance,
      request,
      operationName,
      classFeatures,
      classFeature,
      cache
    })
  }
}
