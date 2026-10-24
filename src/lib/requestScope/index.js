import { AsyncLocalStorage } from 'node:async_hooks'

// Per-request scope: a memo and a set of batch loaders that live exactly as long as one HTTP
// request. Nothing here is process-wide, so nothing can be stale across requests.
//
// The scope is carried by AsyncLocalStorage. Because some middleware (body parsers reading the
// request stream) resumes outside the async context that started the request, the scope is also
// stored on the native request object, and every route handler re-enters it from there.

const scopeStorage = new AsyncLocalStorage()
const SCOPE_PROPERTY_NAME = '__servableRequestScope'

export const createRequestScope = () => ({
  memoPromisesByKey: new Map(),
  batchLoadersByName: new Map(),
})

export const currentRequestScope = () => scopeStorage.getStore()

export const hasRequestScope = () => Boolean(scopeStorage.getStore())

// Runs `work` inside a brand new scope.
export const runInNewRequestScope = (work) => scopeStorage.run(createRequestScope(), work)

// Runs `work` inside the scope attached to a native (Express) request, creating and attaching
// one the first time. Calling it again with the same request re-enters the same scope.
export const runInRequestScopeOf = ({ nativeRequest, work }) => {
  if (!nativeRequest || typeof nativeRequest !== 'object') {
    return runInNewRequestScope(work)
  }
  let scope = nativeRequest[SCOPE_PROPERTY_NAME]
  if (!scope) {
    scope = createRequestScope()
    Object.defineProperty(nativeRequest, SCOPE_PROPERTY_NAME, {
      value: scope,
      enumerable: false,
      configurable: true,
    })
  }
  return scopeStorage.run(scope, work)
}

// Memoizes the promise of `load` under `key` for the life of the current request, so concurrent
// callers share one load. A failed load is removed so a later caller tries again. Outside a
// request there is no scope to keep it in: `load` simply runs, nothing is retained.
export const requestMemo = ({ key, load }) => {
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('requestMemo needs a non-empty string key')
  }
  if (typeof load !== 'function') {
    throw new Error('requestMemo needs a load function')
  }
  const scope = scopeStorage.getStore()
  if (!scope) {
    return Promise.resolve().then(load)
  }
  const existingPromise = scope.memoPromisesByKey.get(key)
  if (existingPromise) {
    return existingPromise
  }
  const promise = Promise.resolve().then(load)
  scope.memoPromisesByKey.set(key, promise)
  promise.catch(() => {
    if (scope.memoPromisesByKey.get(key) === promise) {
      scope.memoPromisesByKey.delete(key)
    }
  })
  return promise
}

const valueForId = ({ results, id, index }) => {
  if (results instanceof Map) {
    return results.get(id)
  }
  if (Array.isArray(results)) {
    return results[index]
  }
  if (results && typeof results === 'object') {
    return results[id]
  }
  return undefined
}

const buildBatchLoader = ({ batchLoad, maxBatchSize }) => {
  const promisesById = new Map()
  let queuedEntries = []
  let isDispatchScheduled = false

  const runChunk = async (entries) => {
    const ids = entries.map((entry) => entry.id)
    try {
      const results = await batchLoad(ids)
      if (Array.isArray(results) && results.length !== ids.length) {
        throw new Error(
          `batchLoad returned ${results.length} results for ${ids.length} ids`
        )
      }
      entries.forEach((entry, index) => {
        entry.resolve(valueForId({ results, id: entry.id, index }))
      })
    } catch (error) {
      // A failed batch is not kept: each id can be asked again.
      entries.forEach((entry) => {
        promisesById.delete(entry.id)
        entry.reject(error)
      })
    }
  }

  const dispatch = () => {
    isDispatchScheduled = false
    const entries = queuedEntries
    queuedEntries = []
    const chunkSize = maxBatchSize > 0 ? maxBatchSize : entries.length
    for (let start = 0; start < entries.length; start += chunkSize) {
      runChunk(entries.slice(start, start + chunkSize))
    }
  }

  const scheduleDispatch = () => {
    if (isDispatchScheduled) {
      return
    }
    isDispatchScheduled = true
    // After the current promise jobs, so ids asked by sibling async work in the same tick land
    // in the same batch.
    Promise.resolve().then(() => process.nextTick(dispatch))
  }

  const load = (id) => {
    const existingPromise = promisesById.get(id)
    if (existingPromise) {
      return existingPromise
    }
    const promise = new Promise((resolve, reject) => {
      queuedEntries.push({ id, resolve, reject })
    })
    promisesById.set(id, promise)
    scheduleDispatch()
    return promise
  }

  return {
    load,
    loadMany: (ids) => Promise.all(ids.map(load)),
  }
}

// DataLoader-style batching. Ids asked in the same tick are collected and sent to ONE
// `batchLoad(ids)` call (split into chunks of `maxBatchSize` when given). `batchLoad` returns a
// Map keyed by id, a plain object keyed by id, or an array aligned with `ids`; an id without a
// result resolves to undefined. Returns `{ load(id), loadMany(ids) }`.
//
// With a `name`, the loader is created once per request and the same instance is returned to
// every caller of that name in that request, so ids asked from unrelated code still batch and
// repeat ids are answered from memory. Without a name, or outside a request, the loader is a
// throwaway used by the caller only.
export const createBatchLoader = ({ name, batchLoad, maxBatchSize = 0 }) => {
  if (typeof batchLoad !== 'function') {
    throw new Error('createBatchLoader needs a batchLoad function')
  }
  const scope = scopeStorage.getStore()
  if (!scope || !name) {
    return buildBatchLoader({ batchLoad, maxBatchSize })
  }
  let loader = scope.batchLoadersByName.get(name)
  if (!loader) {
    loader = buildBatchLoader({ batchLoad, maxBatchSize })
    scope.batchLoadersByName.set(name, loader)
  }
  return loader
}

// The object exposed as `Servable.RequestScope`.
export default {
  runInNewRequestScope,
  runInRequestScopeOf,
  currentRequestScope,
  hasRequestScope,
  requestMemo,
  createBatchLoader,
}
