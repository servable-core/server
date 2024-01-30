import execute from './execute/index.js'

export const beforeSave = async ({ request, allFeatures, feature }) => {
  const { object } = request
  let dirtyKeys = object.dirtyKeys()
  dirtyKeys = dirtyKeys ? dirtyKeys : []
  request.context.dirtyKeys = dirtyKeys

  await execute({
    allFeatures,
    feature,
    request,
    operationName: 'beforeSave'
  })
}

export const afterSave = async ({ request, allFeatures, feature, }) => {
  await execute({
    allFeatures,
    feature,
    request,
    operationName: 'afterSave'
  })
}

export const beforeDelete = async ({ request, allFeatures, feature, }) => {
  await execute({
    allFeatures,
    feature,
    request,
    operationName: 'beforeDelete'
  })
}

export const afterDelete = async ({ request, allFeatures, feature, }) => {
  await execute({
    allFeatures,
    feature,
    request,
    operationName: 'afterDelete'
  })
}

export const beforeFind = async ({ request, allFeatures, feature, }) => {
  await execute({
    allFeatures,
    feature,
    request,
    operationName: 'beforeFind'
  })
}


export const afterFind = async ({ request, allFeatures, feature, }) => {
  await execute({
    allFeatures,
    feature,
    request,
    operationName: 'afterFind'
  })
}
