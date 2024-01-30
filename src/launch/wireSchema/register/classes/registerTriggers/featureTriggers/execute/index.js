import performItem from './performItem.js'
import adaptFeaturePayload from '../../../../../../utils/adaptFeaturePayload.js'

export default async ({
  allFeatures,
  feature,
  request,
  operationName
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
  let items = await feature.loader.classFeatures({ className })
  if (!items || !items.length) {
    return
  }

  items = items.map(adaptFeaturePayload)

  // const items = object.constructor.features
  //     ? object.constructor.features.map(adaptFeaturePayload)
  //     : []

  const cache = {}
  for (var i in items) {
    const item = items[i]
    await performItem({
      allFeatures,
      feature,
      request,
      operationName,
      items,
      item,
      cache
    })
  }
}
