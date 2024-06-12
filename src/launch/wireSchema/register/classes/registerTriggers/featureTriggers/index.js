import execute from './execute/index.js'

export const beforeSave = async ({
  request,
  featureInstance,
  allFeatures,
  feature }) => {
  const { object } = request
  let dirtyKeys = object.dirtyKeys()
  dirtyKeys = dirtyKeys ? dirtyKeys : []
  request.context.dirtyKeys = dirtyKeys

  await execute({
    allFeatures,
    feature,
    featureInstance,
    request,
    operationName: 'beforeSave'
  })
}

export const afterSave = async ({ request, allFeatures, feature, featureInstance }) => {
  await execute({
    allFeatures,
    feature,
    featureInstance,
    request,
    operationName: 'afterSave'
  })
}

export const beforeDelete = async ({ request, allFeatures, feature, featureInstance, }) => {
  await execute({
    allFeatures,
    feature,
    featureInstance,
    request,
    operationName: 'beforeDelete'
  })
}

export const afterDelete = async ({ request, allFeatures, feature, featureInstance, }) => {
  await execute({
    allFeatures,
    feature,
    featureInstance,
    request,
    operationName: 'afterDelete'
  })
}

export const beforeFind = async ({ request, allFeatures, feature, featureInstance, }) => {
  await execute({
    allFeatures,
    feature,
    featureInstance,
    request,
    operationName: 'beforeFind'
  })
}


export const afterFind = async ({ request, allFeatures, feature, featureInstance, }) => {
  await execute({
    allFeatures,
    feature,
    featureInstance,
    request,
    operationName: 'afterFind'
  })
}
