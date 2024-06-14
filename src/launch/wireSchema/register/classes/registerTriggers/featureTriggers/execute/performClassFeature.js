import _ from 'underscore'

const perform = async ({
  featureParams,
  allFeatures,
  classFeatures,
  cache,
  operationName,
  feature,
  featureInstance,
  request }) => {

  const featureId = _.isObject(featureParams) ? featureParams.id : featureParams
  if (cache[featureId] === 1 || cache[featureId] === 2 || cache[featureId] === 3) {
    return
  }

  const _module = _.findWhere(allFeatures, { id: featureId })
  if (!_module) {
    return
  }

  const triggers = await _module.loader.triggers()
  if (!triggers) {
    return
  }
  let operation = triggers[operationName]
  if (!operation) {
    operation = triggers[operationName.toLowerCase()]
  }

  if (!operation) {
    return
  }

  const metadata = await _module.loader.triggersMetadata()
  if (!metadata || !metadata.dependencies || !metadata.dependencies.length) {
    return doPerform({
      request,
      feature,
      featureParams,
      featureInstance,
      operation,
      featureId,
      operationName,
      cache
    })
  }

  const { dependencies = [] } = metadata
  for (var i in dependencies) {
    const dependency = dependencies[i]

    const { id } = dependency

    if (cache[id] === 1 || cache[id] === 2 || cache[id] === 3) {
      continue
    }

    const candidates = classFeatures.filter(a => (a.id === id || a === id))
    if (!candidates || !candidates.length) {
      continue
    }
    const candidate = candidates[0]
    await perform({
      allFeatures,
      classFeatures,
      cache,
      operationName,
      feature,
      featureInstance,
      request,
      featureParams: candidate
    })
  }

  return doPerform({
    request,
    feature,
    featureParams,
    featureInstance,
    operation,
    featureId,
    operationName,
    cache
  })
}

const doPerform = async ({
  request,
  feature,
  featureInstance,
  featureParams,
  cache,
  operation,
  featureId,
  operationName }) => {
  try {
    cache[featureId] = 1
    await operation({ request, feature, featureInstance, featureParams, })
    cache[featureId] = 2
  } catch (e) {
    console.error(`Feature > ${featureId} > ${operationName}`, e.message)
    cache[featureId] = 3
  }
}

export default perform
