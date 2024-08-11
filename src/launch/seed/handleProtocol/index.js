import doPerform from './doSeed.js'

const perform = async ({
  protocol,
  protocols,
  cache,
  operationProps,
  configuration }) => {

  const { metadata, } = protocol
  if (cache[protocol.id]) {
    return
  }

  if (!metadata || !metadata.dependencies || !metadata.dependencies.length) {
    await doPerform({ protocol, operationProps, configuration })
    cache[protocol.id] = true
    return
  }

  const { dependencies = [] } = metadata
  for (var i in dependencies) {
    const dependency = dependencies[i]
    const { id } = dependency

    if (cache[id]) {
      return
    }

    const candidates = protocols.filter(a => a.id === id)
    if (!candidates || !candidates.length) {
      return
    }
    const candidate = candidates[0]
    await perform({
      items: protocols,
      cache,
      operationProps,
      configuration,
      item: candidate
    })

  }

  await doPerform({ protocol, operationProps, configuration })
  cache[protocol.id] = true
}

export default perform
