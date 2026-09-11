import get from '../crud/get.js'
import prepareModel from './prepareModel.js'

// No auto-create, unlike parseServerState's own stateForConfiguration - a missing document here
// legitimately means "no schema has ever been applied to this database" (compatibilityFloor: 0,
// nothing to refuse), which recordAppliedArtifact.js's own upsert already handles; there is no
// state a caller needs before that first apply.
export default async ({ databaseURI, key }) => {
  const model = await prepareModel({ databaseURI })
  return get({ model, key })
}
