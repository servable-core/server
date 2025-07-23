import doPerform from './doSeed.js'

const perform = async ({
  item,
  items,
  cache,
  operationProps,
  configuration }) => {

  const { metadata, } = item
  if (cache[item.id]) {
    return
  }

  if (!metadata || !metadata.dependencies || !metadata.dependencies.length) {
    await doPerform({ protocol: item, operationProps, configuration })
    cache[item.id] = true
    return
  }

  const { dependencies = [] } = metadata
  for (var i in dependencies) {
    const dependency = dependencies[i]
    const { id } = dependency

    if (cache[id]) {
      return
    }

    const candidates = items.filter(a => a.id === id)
    if (!candidates || !candidates.length) {
      return
    }
    const candidate = candidates[0]
    await perform({
      items: items,
      cache,
      operationProps,
      configuration,
      item: candidate
    })

  }

  await doPerform({ protocol: item, operationProps, configuration })
  cache[item.id] = true
}

export default perform
