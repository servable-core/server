// utilless (PEAKUB-321) - the engine-owned state store.
//
// Servable's own boot bookkeeping (the unischema compatibility floor, and the seed/config
// hash-skip records) used to live in a separate "utils" MongoDB that this package talked to
// directly through mongoose. It now lives wherever the ENGINE decides -
// @servable/parse-server-engine keeps it as plain collections in the same MongoDB Parse Server
// uses, so it is backed up and restored together with the data it describes.
//
// This file is the contract. An engine exposes `createStateStore({ servableConfig })`, resolving to:
//
//   schemaState.get({ key })
//     -> { key, artifactHash, appliedAt, compatibilityFloor } | null
//   schemaState.recordApplied({ key, artifactHash, compatibilityFloor })
//     -> the stored document. MUST raise the floor atomically and never lower it: two pods on
//        different builds can call this in the same window, and a read-then-write
//        implementation regresses an already-raised floor (see this package's CLAUDE.md).
//   bootState.get({ kind, type, entityId })              kind: 'seed' | 'config'
//     -> { type, entityId, state, dataSHA, ... } | null
//   bootState.save({ kind, type, entityId, fields })
//     -> upserts `fields` onto that record, returns the stored document.
//
// bootState is bookkeeping, NOT a lock: the Loading state never kept a concurrent pod from
// running the same seed (seed idempotency comes from uniqueRef), and no implementation should be
// read as promising mutual exclusion.
//
// No no-op fallback, unlike the Servable.App.* contracts: a store that silently does nothing
// would disable the compatibility-floor guard. An engine without one fails boot.

export const BOOT_STATE_KINDS = Object.freeze(['seed', 'config'])

const REQUIRED = {
  schemaState: ['get', 'recordApplied'],
  bootState: ['get', 'save'],
}

export const assertStateStore = (store) => {
  const missing = []
  for (const [group, fns] of Object.entries(REQUIRED)) {
    for (const fn of fns) {
      if (typeof store?.[group]?.[fn] !== 'function') {
        missing.push(`${group}.${fn}`)
      }
    }
  }

  if (missing.length) {
    throw new Error(`The engine's state store is missing: ${missing.join(', ')}`)
  }

  return store
}

export default async ({ servableConfig, engine }) => {
  if (typeof engine?.createStateStore !== 'function') {
    throw new Error(
      'This engine does not implement createStateStore() - @servable/server needs it to record ' +
      'the schema compatibility floor and seed/config state. Upgrade the engine package.'
    )
  }

  return assertStateStore(await engine.createStateStore({ servableConfig }))
}
