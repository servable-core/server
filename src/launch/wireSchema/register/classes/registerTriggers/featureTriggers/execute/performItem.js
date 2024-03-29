import _ from 'underscore'

const perform = async ({
  item,
  allFeatures,
  items,
  cache,
  operationName,
  feature,
  request }) => {

  const featureId = _.isObject(item) ? item.id : item
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

    const candidates = items.filter(a => (a.id === id || a === id))
    if (!candidates || !candidates.length) {
      continue
    }
    const candidate = candidates[0]
    await perform({
      allFeatures,
      items,
      cache,
      operationName,
      feature,
      request,
      item: candidate
    })
  }

  return doPerform({
    request,
    feature,
    operation,
    featureId,
    operationName,
    cache
  })
}

const doPerform = async ({
  request,
  feature,
  cache,
  operation,
  featureId,
  operationName }) => {
  try {
    cache[featureId] = 1
    await operation({ request, feature, })
    cache[featureId] = 2
  } catch (e) {
    console.error(`Feature > ${featureId} > ${operationName}`, e.message)
    cache[featureId] = 3
  }
}

export default perform
