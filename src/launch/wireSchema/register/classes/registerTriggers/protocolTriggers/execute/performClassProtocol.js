import _ from 'underscore'

const perform = async ({
  protocolParams,
  allProtocols,
  classProtocols,
  cache,
  operationName,
  protocol,
  protocolInstance,
  request }) => {

  const protocolId = _.isObject(protocolParams) ? protocolParams.id : protocolParams
  if (cache[protocolId] === 1 || cache[protocolId] === 2 || cache[protocolId] === 3) {
    return
  }

  const _module = _.findWhere(allProtocols, { id: protocolId })
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
      protocol,
      protocolParams,
      protocolInstance,
      operation,
      protocolId,
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

    const candidates = classProtocols.filter(a => (a.id === id || a === id))
    if (!candidates || !candidates.length) {
      continue
    }
    const candidate = candidates[0]
    await perform({
      allProtocols,
      classProtocols,
      cache,
      operationName,
      protocol,
      protocolInstance,
      request,
      protocolParams: candidate
    })
  }

  return doPerform({
    request,
    protocol,
    protocolParams,
    protocolInstance,
    operation,
    protocolId,
    operationName,
    cache
  })
}

const doPerform = async ({
  request,
  protocol,
  protocolInstance,
  protocolParams,
  cache,
  operation,
  protocolId,
  operationName }) => {
  try {
    cache[protocolId] = 1
    await operation({ request, protocol, protocolInstance, protocolParams, })
    cache[protocolId] = 2
  } catch (e) {
    console.error(`Protocol > ${protocolId} > ${operationName}`, e.message)
    cache[protocolId] = 3
  }
}

export default perform
