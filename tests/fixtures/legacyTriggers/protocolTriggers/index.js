import execute from './execute/index.js'

export const beforeSave = async ({
  request,
  protocolInstance,
  allProtocols,
  protocol }) => {
  const { object } = request
  let dirtyKeys = object.dirtyKeys()
  dirtyKeys = dirtyKeys ? dirtyKeys : []
  request.context.dirtyKeys = dirtyKeys

  await execute({
    allProtocols,
    protocol,
    protocolInstance,
    request,
    operationName: 'beforeSave'
  })
}

export const afterSave = async ({ request, allProtocols, protocol, protocolInstance }) => {
  // await execute({
  //   allProtocols,
  //   protocol,
  //   protocolInstance,
  //   request,
  //   operationName: 'afterSave'
  // })
  execute({
    allProtocols,
    protocol,
    protocolInstance,
    request,
    operationName: 'afterSave'
  })
}

export const beforeDelete = async ({ request, allProtocols, protocol, protocolInstance, }) => {
  await execute({
    allProtocols,
    protocol,
    protocolInstance,
    request,
    operationName: 'beforeDelete'
  })
}

export const afterDelete = async ({ request, allProtocols, protocol, protocolInstance, }) => {
  await execute({
    allProtocols,
    protocol,
    protocolInstance,
    request,
    operationName: 'afterDelete'
  })
}

export const beforeFind = async ({ request, allProtocols, protocol, protocolInstance, }) => {
  await execute({
    allProtocols,
    protocol,
    protocolInstance,
    request,
    operationName: 'beforeFind'
  })
}


export const afterFind = async ({ request, allProtocols, protocol, protocolInstance, }) => {
  await execute({
    allProtocols,
    protocol,
    protocolInstance,
    request,
    operationName: 'afterFind'
  })
}
