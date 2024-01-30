import doPerform from './doSeed.js'

const perform = async ({
  feature,
  features,
  cache,
  operationProps,
  configuration }) => {

  const { metadata, } = feature
  if (cache[feature.id]) {
    return
  }

  if (!metadata || !metadata.dependencies || !metadata.dependencies.length) {
    await doPerform({ feature, operationProps, configuration })
    cache[feature.id] = true
    return
  }

  const { dependencies = [] } = metadata
  for (var i in dependencies) {
    const dependency = dependencies[i]
    const { id } = dependency

    if (cache[id]) {
      return
    }

    const candidates = features.filter(a => a.id === id)
    if (!candidates || !candidates.length) {
      return
    }
    const candidate = candidates[0]
    await perform({
      items: features,
      cache,
      operationProps,
      configuration,
      item: candidate
    })

  }

  await doPerform({ feature, operationProps, configuration })
  cache[feature.id] = true
}

export default perform
