import { createHash } from 'node:crypto'
import { sessionUserCacheSignals } from './sessionSignals.js'

// Who a session token is, remembered for a few seconds in this process (framework performance audit 2026-11-23, F3;
// owner's Q1092 a). Every signed-in request resolved its token with a `_Session` query including the user (two
// MongoDB reads, through Parse), whether or not the route needed the user; pollers make tens of thousands a day.
//
// Rules, all deliberate:
//   - Keyed by a digest of the token (SHA-256, 32 hexadecimal characters), never the token.
//   - Only a valid lookup is remembered: a session found, not expired, with its user. A token that resolves to
//     nothing, or a lookup that failed, is never remembered, so a wrong token always costs a real lookup and a token
//     that becomes valid is seen at once.
//   - An entry lives `ttlMilliseconds` (10 s by default) from when it was stored, never renewed by a read, and never
//     past the session's own `expiresAt`.
//   - It is forgotten at once, in this process, on the engine's reports (`Servable.App.SessionInvalidations`): that
//     session deleted or changed (a sign-out, a revocation), its user saved or deleted. A lookup that was running
//     when a report came is not stored. Without reports from the engine the cache does not start at all.
//   - Another replica's sign-out or user save is not reported here: this process may serve that session as it was
//     for at most `ttlMilliseconds`. That is the documented bound (two replicas: a sign-out on pod A is seen by pod B
//     within 10 seconds).
//   - Bounded: at most `maxEntries` (10,000 by default), the least recently used dropped first.
//   - Each request gets its own copy of the user, rebuilt from a snapshot: a handler that changes its `user` never
//     changes another request's.
//
// Settings: `servableConfig.configuration.config.server.{isSessionUserCacheEnabled, sessionUserCacheTtlMilliseconds,
// sessionUserCacheMaxEntries}`, each overridden by its environment variable when that says something:
// SERVABLE_SESSION_USER_CACHE (on/off), SERVABLE_SESSION_USER_CACHE_TTL_MS, SERVABLE_SESSION_USER_CACHE_MAX_ENTRIES.

export const SESSION_USER_CACHE_DEFAULTS = Object.freeze({
  isSessionUserCacheEnabled: true,
  sessionUserCacheTtlMilliseconds: 10 * 1000,
  sessionUserCacheMaxEntries: 10 * 1000,
})

const HASHED_TOKEN_LENGTH = 32

/**
 * @param {string} sessionToken
 * @returns {string}
 */
export const hashedSessionTokenOf = (sessionToken) =>
  createHash('sha256').update(String(sessionToken)).digest('hex').slice(0, HASHED_TOKEN_LENGTH)

/**
 * @param {unknown} rawValue
 * @returns {boolean | undefined}
 */
const booleanFromEnvironmentValue = (rawValue) => {
  const value = String(rawValue ?? '').trim().toLowerCase()
  if (['1', 'true', 'on'].includes(value)) {
    return true
  }
  if (['0', 'false', 'off'].includes(value)) {
    return false
  }
  return undefined
}

/**
 * @param {unknown} rawValue
 * @returns {number | undefined}
 */
const positiveIntegerFrom = (rawValue) => {
  const value = Number(typeof rawValue === 'string' ? rawValue.trim() : rawValue)
  return Number.isInteger(value) && value > 0 ? value : undefined
}

/**
 * The settings as they apply to this process: the environment when it says something readable, else the app's
 * choice, else the default.
 * @param {object} [props]
 * @param {Record<string, any>} [props.serverConfiguration] - `servableConfig.configuration.config.server`.
 * @param {Record<string, string | undefined>} [props.env]
 * @returns {{ isSessionUserCacheEnabled: boolean, sessionUserCacheTtlMilliseconds: number, sessionUserCacheMaxEntries: number }}
 */
export const sessionUserCacheSettingsFrom = ({ serverConfiguration = {}, env = process.env } = {}) => ({
  isSessionUserCacheEnabled: booleanFromEnvironmentValue(env?.SERVABLE_SESSION_USER_CACHE)
    ?? (typeof serverConfiguration?.isSessionUserCacheEnabled === 'boolean' ? serverConfiguration.isSessionUserCacheEnabled : undefined)
    ?? SESSION_USER_CACHE_DEFAULTS.isSessionUserCacheEnabled,
  sessionUserCacheTtlMilliseconds: positiveIntegerFrom(env?.SERVABLE_SESSION_USER_CACHE_TTL_MS)
    ?? positiveIntegerFrom(serverConfiguration?.sessionUserCacheTtlMilliseconds)
    ?? SESSION_USER_CACHE_DEFAULTS.sessionUserCacheTtlMilliseconds,
  sessionUserCacheMaxEntries: positiveIntegerFrom(env?.SERVABLE_SESSION_USER_CACHE_MAX_ENTRIES)
    ?? positiveIntegerFrom(serverConfiguration?.sessionUserCacheMaxEntries)
    ?? SESSION_USER_CACHE_DEFAULTS.sessionUserCacheMaxEntries,
})

/**
 * @typedef {object} ResolvedSession
 * @property {string} sessionId - the `_Session`'s id.
 * @property {string} userId - its user's id.
 * @property {number} expiresAtMilliseconds - when the session expires.
 * @property {string | null} installationId - the device the session is bound to, if any.
 * @property {any} createdWith - how the session was made, for the logs.
 * @property {any} userSnapshot - what the user is rebuilt from, for each request.
 */

/**
 * The cache itself, with no knowledge of where sessions come from.
 * @param {object} props
 * @param {number} props.ttlMilliseconds
 * @param {number} props.maxEntries
 * @param {() => number} [props.now]
 * @param {typeof sessionUserCacheSignals} [props.signals] - what it counts (production proof 3.5, ./sessionSignals.js).
 */
export const createSessionUserCache = ({ ttlMilliseconds, maxEntries, now = Date.now, signals = sessionUserCacheSignals }) => {
  /** @type {Map<string, { session: ResolvedSession, storedAt: number }>} */
  const entries = new Map()
  /** @type {Map<string, Set<string>>} */
  const hashesByUserId = new Map()
  /** @type {Map<string, string>} */
  const hashBySessionId = new Map()
  // Raised by every report: a lookup that started before a report is never stored.
  let invalidationCount = 0

  /** @param {string} hash */
  const drop = (hash) => {
    const entry = entries.get(hash)
    if (!entry) {
      return
    }
    entries.delete(hash)
    const { userId, sessionId } = entry.session
    const hashesOfUser = hashesByUserId.get(userId)
    hashesOfUser?.delete(hash)
    if (hashesOfUser?.size === 0) {
      hashesByUserId.delete(userId)
    }
    if (hashBySessionId.get(sessionId) === hash) {
      hashBySessionId.delete(sessionId)
    }
  }

  return {
    /** What a lookup records before it starts, to hand back to `remember`. */
    invalidationCount: () => invalidationCount,

    /**
     * @param {string} hash
     * @returns {ResolvedSession | null}
     */
    read: (hash) => {
      const entry = entries.get(hash)
      if (!entry) {
        return null
      }
      const time = now()
      if (time - entry.storedAt >= ttlMilliseconds || entry.session.expiresAtMilliseconds <= time) {
        drop(hash)
        return null
      }
      // Least recently used last: a read moves the entry to the end of the Map's order.
      entries.delete(hash)
      entries.set(hash, entry)
      return entry.session
    },

    /**
     * @param {string} hash
     * @param {ResolvedSession} session
     * @param {{ invalidationCountAtStart: number }} props
     * @returns {boolean} whether it was stored.
     */
    remember: (hash, session, { invalidationCountAtStart }) => {
      if (invalidationCountAtStart !== invalidationCount) {
        signals.remembered('refused_invalidated')
        return false
      }
      if (!session?.sessionId || !session?.userId || !(session.expiresAtMilliseconds > now()) || session.userSnapshot == null) {
        signals.remembered('refused_invalid')
        return false
      }
      drop(hash)
      entries.set(hash, { session, storedAt: now() })
      if (!hashesByUserId.has(session.userId)) {
        hashesByUserId.set(session.userId, new Set())
      }
      hashesByUserId.get(session.userId).add(hash)
      hashBySessionId.set(session.sessionId, hash)
      while (entries.size > maxEntries) {
        drop(entries.keys().next().value)
      }
      signals.remembered('stored')
      signals.sized(entries.size)
      return true
    },

    /**
     * One report of the engine (`Servable.App.SessionInvalidations`).
     * @param {{ sessionToken?: string, sessionId?: string, userId?: string, isEverything?: boolean }} invalidation
     */
    forget: (invalidation = {}) => {
      invalidationCount += 1
      if (invalidation.isEverything) {
        signals.invalidated('everything')
        entries.clear()
        hashesByUserId.clear()
        hashBySessionId.clear()
        signals.sized(entries.size)
        return
      }
      if (typeof invalidation.sessionToken === 'string') {
        signals.invalidated('token')
        drop(hashedSessionTokenOf(invalidation.sessionToken))
      }
      if (typeof invalidation.sessionId === 'string') {
        signals.invalidated('session')
        const hash = hashBySessionId.get(invalidation.sessionId)
        hash && drop(hash)
      }
      if (typeof invalidation.userId === 'string') {
        signals.invalidated('user')
        for (const hash of [...(hashesByUserId.get(invalidation.userId) || [])]) {
          drop(hash)
        }
      }
      signals.sized(entries.size)
    },

    size: () => entries.size,
  }
}

/**
 * A plain, deep snapshot of a user object (its class's own JSON, with its class name), or null when the object
 * cannot be rebuilt from one: such a user is then not cached.
 * @param {any} user
 * @returns {any}
 */
export const userSnapshotOf = (user) => {
  if (typeof user?.toJSON !== 'function' || typeof user?.constructor?.fromJSON !== 'function' || !user.className) {
    return null
  }
  return { userClass: user.constructor, json: { ...user.toJSON(), className: user.className } }
}

/**
 * A new user object, owned by the request that asked. The SDK's decoding builds new objects, arrays and dates from
 * the JSON, so nothing of the snapshot is shared with it.
 * @param {any} userSnapshot
 * @returns {any}
 */
export const userFromSnapshot = (userSnapshot) => userSnapshot.userClass.fromJSON(userSnapshot.json)

let cacheOfThisProcess = null

/**
 * The process's cache, started the first time a request asks: null when switched off, or when the engine reports
 * no invalidations (a sign-out would then go unseen for the whole window).
 * @param {object} [props]
 * @param {any} [props.servable] - `global.Servable`.
 * @param {Record<string, string | undefined>} [props.env]
 * @returns {Promise<ReturnType<typeof createSessionUserCache> | null>}
 */
export const sessionUserCacheOfThisProcess = ({ servable = /** @type {any} */ (globalThis).Servable, env = process.env } = {}) => {
  if (!cacheOfThisProcess) {
    cacheOfThisProcess = (async () => {
      const settings = sessionUserCacheSettingsFrom({ serverConfiguration: servable?.ServableConfig?.configuration?.config?.server, env })
      if (!settings.isSessionUserCacheEnabled) {
        console.info('[SERVABLE] [session user cache] off (isSessionUserCacheEnabled / SERVABLE_SESSION_USER_CACHE)')
        return null
      }
      const cache = createSessionUserCache({ ttlMilliseconds: settings.sessionUserCacheTtlMilliseconds, maxEntries: settings.sessionUserCacheMaxEntries })
      try {
        const subscription = await servable?.App?.SessionInvalidations?.subscribe?.((invalidation) => cache.forget(invalidation))
        if (!subscription?.isReported) {
          console.info('[SERVABLE] [session user cache] off: the engine reports no session invalidations', { reason: subscription?.reason })
          return null
        }
      } catch (error) {
        console.error('[SERVABLE] [session user cache] off: subscribing to session invalidations failed', { message: error?.message })
        return null
      }
      console.info('[SERVABLE] [session user cache] on', { ttlMilliseconds: settings.sessionUserCacheTtlMilliseconds, maxEntries: settings.sessionUserCacheMaxEntries })
      return cache
    })()
  }
  return cacheOfThisProcess
}

/** For tests: the next request starts a new cache. */
export const resetSessionUserCacheOfThisProcessForTests = () => {
  cacheOfThisProcess = null
}
