import execute from './execute/index.js'

// The protocols' part of each trigger. `kindPlan` is the class's plan for that kind (../triggerPlan.js).

export const beforeSave = async ({ request, protocolInstance, protocol, kindPlan }) => {
  const { object } = request
  let dirtyKeys = object.dirtyKeys()
  dirtyKeys = dirtyKeys ? dirtyKeys : []
  // Read by the afterSave hooks: Parse copies the beforeSave context into the afterSave request.
  request.context.dirtyKeys = dirtyKeys

  await execute({
    protocol,
    protocolInstance,
    request,
    operationName: 'beforeSave',
    protocolOperations: kindPlan.protocolOperations,
  })
}

// Not awaited by the trigger: the afterSave operations run in the background, as before. The first turn is given
// back before any of them starts, so the class's own afterSave hooks still start first: before the plan, the protocols
// only started after the loader's file checks.
export const afterSave = async ({ request, protocol, protocolInstance, kindPlan }) => {
  await Promise.resolve()
  await execute({
    protocol,
    protocolInstance,
    request,
    operationName: 'afterSave',
    protocolOperations: kindPlan.protocolOperations,
  })
}

export const beforeDelete = async ({ request, protocol, protocolInstance, kindPlan }) => {
  await execute({
    protocol,
    protocolInstance,
    request,
    operationName: 'beforeDelete',
    protocolOperations: kindPlan.protocolOperations,
  })
}

export const afterDelete = async ({ request, protocol, protocolInstance, kindPlan }) => {
  await execute({
    protocol,
    protocolInstance,
    request,
    operationName: 'afterDelete',
    protocolOperations: kindPlan.protocolOperations,
  })
}
