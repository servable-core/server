// A small cross-request cache-aside for ONE fact (for example "the custom domain of this
// publication"), never for a composed tree. See .docs/technical/serializable-cache-review.md, layer 2.
//
// Servable does not own a Redis connection and depends on no Redis package. The application
// registers one with `registerCacheClient(getClient)`, where `getClient` is an async function
// answering a node-redis v4 style client (get, set, del) or null when none is available.
//
// Rules, all deliberate:
//   - The time to live is fixed: it is set once when the value is written and never renewed on a
//     read, so a lost invalidation can only make a value stale for `ttlSeconds`, never forever.
//   - It fails open: if no client is registered, Redis is down, slow or answers garbage, the value
//     is loaded from its source as if there were no cache. A cache problem never fails the caller.
//   - An answer of "nothing" (null) is a real answer and is cached; a load that throws is never
//     cached and its error reaches the caller.
//   - The value is wrapped as {"value": ...} so a cached null can be told apart from a miss.
//     Values must be JSON-serializable plain data.

const DEFAULT_COMMAND_TIMEOUT_MS = 1000

let getCacheClient = null
let commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS

// `getClient` is called on every cache operation, so the application keeps owning the connection,
// its reconnection and its shutdown. Pass null to unregister.
export const registerCacheClient = (getClient, { timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS } = {}) => {
  if (getClient !== null && typeof getClient !== 'function') {
    throw new Error('registerCacheClient needs a function answering a Redis client, or null')
  }
  getCacheClient = getClient
  commandTimeoutMs = timeoutMs
}

export const cacheAside = async ({ key, ttlSeconds, load }) => {
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('cacheAside needs a non-empty string key')
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('cacheAside needs a ttlSeconds that is a positive integer')
  }
  if (typeof load !== 'function') {
    throw new Error('cacheAside needs a load function')
  }

  const cachedEntry = await readCachedEntry(key)
  if (cachedEntry) {
    return cachedEntry.value
  }

  const loadedValue = await load()
  await writeCachedEntry({ key, ttlSeconds, value: loadedValue })
  return loadedValue
}

// Drops one key. Returns true when Redis confirmed it, false when it could not be reached; it never
// throws, so an event consumer can call it without risking its own message.
export const forgetCachedKey = async (key) => {
  try {
    const redisClient = await getRedisClientOrNull()
    if (!redisClient) {
      return false
    }
    await runBounded(() => redisClient.del(key))
    return true
  } catch (error) {
    console.error('[servable/cacheAside] could not delete cached key', key, error?.message || error)
    return false
  }
}

const getRedisClientOrNull = async () => {
  if (!getCacheClient) {
    return null
  }
  return (await getCacheClient()) || null
}

const runBounded = async (command) => {
  let timer
  try {
    return await Promise.race([
      command(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Redis command timed out after ${commandTimeoutMs}ms`)), commandTimeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

const readCachedEntry = async (key) => {
  try {
    const redisClient = await getRedisClientOrNull()
    if (!redisClient) {
      return null
    }
    const storedText = await runBounded(() => redisClient.get(key))
    if (typeof storedText !== 'string') {
      return null
    }
    const parsedEntry = JSON.parse(storedText)
    if (!parsedEntry || typeof parsedEntry !== 'object' || !('value' in parsedEntry)) {
      return null
    }
    return parsedEntry
  } catch (error) {
    console.error('[servable/cacheAside] read failed, loading from the source', key, error?.message || error)
    return null
  }
}

const writeCachedEntry = async ({ key, ttlSeconds, value }) => {
  try {
    const redisClient = await getRedisClientOrNull()
    if (!redisClient) {
      return
    }
    // node-redis v4 signature: the expiry is an option, set once, never refreshed by a read.
    await runBounded(() => redisClient.set(key, JSON.stringify({ value: value === undefined ? null : value }), { EX: ttlSeconds }))
  } catch (error) {
    console.error('[servable/cacheAside] write failed, answer still returned', key, error?.message || error)
  }
}

export default { registerCacheClient, cacheAside, forgetCachedKey }
