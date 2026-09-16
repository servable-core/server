import BootState from './bootStateEnum.js'

// Shared by seeds (launch/seed/handleProtocol/auto) and configs (launch/config/handleProtocol):
// skip when the last run finished with the same data hash, otherwise record Loading, run, then
// record LoadedSuccessfully or ErrorLoading. Initial, Loading (a pod that died mid-run) and
// ErrorLoading all re-run - the same behavior both handlers had when each kept a mongoose
// document in the utils database.
//
// `run` may resolve to:
//   { fields }            extra fields recorded with LoadedSuccessfully (e.g. dataCount)
//   { completed: false }  stop without recording success - the record stays Loading, so the
//                         next boot runs it again
export default async ({ stateStore, kind, type, entityId, mode, dataSHA, run }) => {
  const key = { kind, type, entityId }

  const stored = await stateStore.bootState.get(key)
  if (stored?.state === BootState.LoadedSuccessfully && stored.dataSHA === dataSHA) {
    return { skipped: true }
  }

  const save = (fields) => stateStore.bootState.save({
    ...key,
    fields: { mode, updatedAt: new Date(), ...fields },
  })

  await save({ state: BootState.Loading, lastOperationStartedAt: new Date() })

  let outcome
  try {
    outcome = await run()
  } catch (error) {
    // Recording the failure must never replace the error that caused it.
    await save({ state: BootState.ErrorLoading, lastOperationEndedAt: new Date() })
      .catch(saveError => console.error('[Servable]', 'could not record ErrorLoading', saveError))
    throw error
  }

  if (outcome?.completed === false) {
    return { skipped: false, completed: false }
  }

  await save({
    ...(outcome?.fields || {}),
    state: BootState.LoadedSuccessfully,
    dataSHA,
    lastOperationEndedAt: new Date(),
  })

  return { skipped: false, completed: true }
}
