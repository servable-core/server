import { jest } from '@jest/globals'
import {
  createSessionUserCache,
  hashedSessionTokenOf,
  resetSessionUserCacheOfThisProcessForTests,
  sessionUserCacheSettingsFrom,
} from '../../src/lib/sessionUserCache/index.js'
import userResolver from '../../src/launch/wireSchema/register/routes/utils/userResolver.js'
import ServableClass from '../../src/domain/servable/index.js'
import SessionInvalidationsContract from '../../src/domain/servable/sessionInvalidations/index.js'

// The session-user cache (F3, owner's Q1092 a): who a session token is, remembered 10 s by a digest of the token,
// forgotten at once on a sign-out, a revoked or changed session and a saved user (the engine's reports), never past
// the session's expiry, bounded, switchable, and never remembering a lookup that found nothing.

const TOKEN = 'r:0123456789abcdef0123456789abcdef'

// A user class shaped like the SDK's: toJSON, a static fromJSON, a className.
class FakeUser {
  constructor (json = {}) {
    this.className = '_User'
    this.id = json.objectId
    this.attributes = { ...json }
    delete this.attributes.objectId
    delete this.attributes.className
  }

  get (key) { return this.attributes[key] }
  set (key, value) { this.attributes[key] = value }
  toJSON () { return { objectId: this.id, ...JSON.parse(JSON.stringify(this.attributes)) } }
  // Like the SDK's decoding, which builds new objects and arrays from the JSON (proven against the real SDK in the engine's integration check).
  static fromJSON (json) { return new FakeUser(JSON.parse(JSON.stringify(json))) }
}

const sessionOf = ({ id = 's1', userId = 'u1', expiresAt = new Date(Date.now() + 3600000), installationId = null, name = 'Ada' } = {}) => {
  const user = new FakeUser({ objectId: userId, name, tags: ['a'] })
  const fields = { user, expiresAt, installationId, createdWith: { action: 'login' } }
  return { id, get: (key) => fields[key] }
}

// A Servable with a `_Session` query that answers from a table of tokens, counting lookups, and an engine that reports
// invalidations to whoever subscribes.
const servableWith = ({ sessionsByToken, isReported = true }) => {
  const lookups = { count: 0 }
  let listener = null
  class Query {
    constructor (className) { this.className = className; this.conditions = {} }
    equalTo (key, value) { this.conditions[key] = value; return this }
    greaterThan () { return this }
    include () { return this }
    async first () {
      lookups.count += 1
      return sessionsByToken.get(this.conditions.sessionToken) ?? undefined
    }
  }
  const servable = {
    ServableConfig: { configuration: { config: { server: {} } } },
    App: {
      Query,
      SessionInvalidations: {
        subscribe: async (newListener) => {
          if (!isReported) return { isReported: false, reason: 'not here', unsubscribe: () => {} }
          listener = newListener
          return { isReported: true, unsubscribe: () => { listener = null } }
        },
      },
    },
  }
  return { servable, lookups, report: (invalidation) => listener?.(invalidation) }
}

const requestWith = (token, headers = {}) => ({ headers: { 'x-servable-session-token': token, ...headers } })

describe('session-user cache', () => {
  describe('the cache', () => {
    const clock = { now: 1_000_000 }
    const resolvedOf = (overrides = {}) => ({ sessionId: 's1', userId: 'u1', expiresAtMilliseconds: clock.now + 3600000, installationId: null, createdWith: null, userSnapshot: { json: {} }, ...overrides })
    const cacheOf = (props = {}) => createSessionUserCache({ ttlMilliseconds: 10000, maxEntries: 3, now: () => clock.now, ...props })

    test('a miss, then a hit, for the time to live only', () => {
      const cache = cacheOf()
      expect(cache.read('h1')).toBeNull()
      expect(cache.remember('h1', resolvedOf(), { invalidationCountAtStart: cache.invalidationCount() })).toBe(true)
      expect(cache.read('h1')).toEqual(resolvedOf())
      clock.now += 9999
      expect(cache.read('h1')).not.toBeNull()
      clock.now += 1
      expect(cache.read('h1')).toBeNull()
      expect(cache.size()).toBe(0)
    })

    test('never past the session\'s own expiry', () => {
      const cache = cacheOf()
      cache.remember('h1', resolvedOf({ expiresAtMilliseconds: clock.now + 3000 }), { invalidationCountAtStart: 0 })
      clock.now += 2999
      expect(cache.read('h1')).not.toBeNull()
      clock.now += 1
      expect(cache.read('h1')).toBeNull()
      // An expired or unusable session is never stored.
      expect(cache.remember('h2', resolvedOf({ expiresAtMilliseconds: clock.now }), { invalidationCountAtStart: 0 })).toBe(false)
      expect(cache.remember('h3', resolvedOf({ userSnapshot: null }), { invalidationCountAtStart: 0 })).toBe(false)
      expect(cache.remember('h4', resolvedOf({ userId: undefined }), { invalidationCountAtStart: 0 })).toBe(false)
    })

    test('forgets by token, by session, by user and everything', () => {
      const cache = cacheOf({ maxEntries: 10 })
      const hashOfToken = hashedSessionTokenOf(TOKEN)
      cache.remember(hashOfToken, resolvedOf({ sessionId: 's1', userId: 'u1' }), { invalidationCountAtStart: 0 })
      cache.remember('h2', resolvedOf({ sessionId: 's2', userId: 'u1' }), { invalidationCountAtStart: 1 - 1 })
      cache.remember('h3', resolvedOf({ sessionId: 's3', userId: 'u2' }), { invalidationCountAtStart: 0 })
      cache.remember('h4', resolvedOf({ sessionId: 's4', userId: 'u3' }), { invalidationCountAtStart: 0 })
      cache.forget({ sessionToken: TOKEN })
      expect(cache.read(hashOfToken)).toBeNull()
      expect(cache.read('h2')).not.toBeNull()
      cache.forget({ sessionId: 's3' })
      expect(cache.read('h3')).toBeNull()
      cache.remember('h5', resolvedOf({ sessionId: 's5', userId: 'u1' }), { invalidationCountAtStart: cache.invalidationCount() })
      cache.forget({ userId: 'u1' })
      expect(cache.read('h2')).toBeNull()
      expect(cache.read('h5')).toBeNull()
      expect(cache.read('h4')).not.toBeNull()
      cache.forget({ isEverything: true })
      expect(cache.size()).toBe(0)
    })

    test('a lookup that was running when a report came is not stored', () => {
      const cache = cacheOf()
      const invalidationCountAtStart = cache.invalidationCount()
      cache.forget({ userId: 'u1' })
      expect(cache.remember('h1', resolvedOf(), { invalidationCountAtStart })).toBe(false)
      expect(cache.read('h1')).toBeNull()
    })

    test('bounded: the least recently used goes first', () => {
      const cache = cacheOf({ maxEntries: 3 })
      for (const hash of ['h1', 'h2', 'h3']) {
        cache.remember(hash, resolvedOf({ sessionId: hash }), { invalidationCountAtStart: 0 })
      }
      cache.read('h1')
      cache.remember('h4', resolvedOf({ sessionId: 'h4' }), { invalidationCountAtStart: 0 })
      expect(cache.size()).toBe(3)
      expect(cache.read('h2')).toBeNull()
      expect(cache.read('h1')).not.toBeNull()
      expect(cache.read('h3')).not.toBeNull()
      expect(cache.read('h4')).not.toBeNull()
      // The dropped entry left no trace in the indexes: forgetting its session touches nothing else.
      cache.forget({ sessionId: 'h2' })
      expect(cache.size()).toBe(3)
    })
  })

  describe('settings', () => {
    test('defaults, then the app, then the environment', () => {
      expect(sessionUserCacheSettingsFrom({ env: {} })).toEqual({ isSessionUserCacheEnabled: true, sessionUserCacheTtlMilliseconds: 10000, sessionUserCacheMaxEntries: 10000 })
      expect(sessionUserCacheSettingsFrom({ env: {}, serverConfiguration: { isSessionUserCacheEnabled: false, sessionUserCacheTtlMilliseconds: 2000, sessionUserCacheMaxEntries: 50 } }))
        .toEqual({ isSessionUserCacheEnabled: false, sessionUserCacheTtlMilliseconds: 2000, sessionUserCacheMaxEntries: 50 })
      expect(sessionUserCacheSettingsFrom({ env: { SERVABLE_SESSION_USER_CACHE: 'on', SERVABLE_SESSION_USER_CACHE_TTL_MS: '5000', SERVABLE_SESSION_USER_CACHE_MAX_ENTRIES: '7' }, serverConfiguration: { isSessionUserCacheEnabled: false } }))
        .toEqual({ isSessionUserCacheEnabled: true, sessionUserCacheTtlMilliseconds: 5000, sessionUserCacheMaxEntries: 7 })
      // Unreadable values say nothing.
      expect(sessionUserCacheSettingsFrom({ env: { SERVABLE_SESSION_USER_CACHE: 'maybe', SERVABLE_SESSION_USER_CACHE_TTL_MS: '-3' } }).sessionUserCacheTtlMilliseconds).toBe(10000)
    })
  })

  describe('userResolver', () => {
    const originalEnv = { ...process.env }
    beforeEach(() => {
      resetSessionUserCacheOfThisProcessForTests()
      delete process.env.AUTH_JWT_SECRET
      delete process.env.SERVABLE_SESSION_USER_CACHE
      jest.spyOn(console, 'info').mockImplementation(() => {})
      jest.spyOn(console, 'warn').mockImplementation(() => {})
    })
    afterEach(() => {
      process.env = { ...originalEnv }
      delete globalThis.Servable
      jest.restoreAllMocks()
    })
    const install = (props) => {
      const harness = servableWith(props)
      globalThis.Servable = harness.servable
      return harness
    }

    test('one lookup for repeated requests; each gets its own user', async () => {
      const { lookups } = install({ sessionsByToken: new Map([[TOKEN, sessionOf()]]) })
      const first = await userResolver({ request: requestWith(TOKEN) })
      const second = await userResolver({ request: requestWith(TOKEN) })
      const third = await userResolver({ request: requestWith(TOKEN) })
      expect(lookups.count).toBe(1)
      expect([first.id, second.id, third.id]).toEqual(['u1', 'u1', 'u1'])
      expect(second._authSessionId).toBe('s1')
      expect(second).not.toBe(third)
      second.set('name', 'changed by a handler')
      second.get('tags').push('b')
      const fourth = await userResolver({ request: requestWith(TOKEN) })
      expect(fourth.get('name')).toBe('Ada')
      expect(fourth.get('tags')).toEqual(['a'])
    })

    test('a sign-out (the session deleted) is seen by the next request', async () => {
      const sessionsByToken = new Map([[TOKEN, sessionOf()]])
      const { lookups, report } = install({ sessionsByToken })
      expect(await userResolver({ request: requestWith(TOKEN) })).not.toBeNull()
      sessionsByToken.delete(TOKEN)
      report({ sessionToken: TOKEN })
      expect(await userResolver({ request: requestWith(TOKEN) })).toBeNull()
      expect(lookups.count).toBe(2)
    })

    test('a saved user is read again', async () => {
      const sessionsByToken = new Map([[TOKEN, sessionOf({ name: 'Ada' })]])
      const { report } = install({ sessionsByToken })
      await userResolver({ request: requestWith(TOKEN) })
      sessionsByToken.set(TOKEN, sessionOf({ name: 'Ada L.' }))
      report({ userId: 'u1' })
      expect((await userResolver({ request: requestWith(TOKEN) })).get('name')).toBe('Ada L.')
    })

    test('a token that opens nothing is never remembered', async () => {
      const sessionsByToken = new Map()
      const { lookups } = install({ sessionsByToken })
      expect(await userResolver({ request: requestWith(TOKEN) })).toBeNull()
      expect(await userResolver({ request: requestWith(TOKEN) })).toBeNull()
      expect(lookups.count).toBe(2)
      // It becomes valid: seen at once.
      sessionsByToken.set(TOKEN, sessionOf())
      expect((await userResolver({ request: requestWith(TOKEN) })).id).toBe('u1')
    })

    test('an expired session is looked up again', async () => {
      const sessionsByToken = new Map([[TOKEN, sessionOf({ expiresAt: new Date(Date.now() + 50) })]])
      const { lookups } = install({ sessionsByToken })
      await userResolver({ request: requestWith(TOKEN) })
      await new Promise((resolve) => setTimeout(resolve, 60))
      sessionsByToken.delete(TOKEN)
      expect(await userResolver({ request: requestWith(TOKEN) })).toBeNull()
      expect(lookups.count).toBe(2)
    })

    test('device binding is checked on every request, cached or not', async () => {
      install({ sessionsByToken: new Map([[TOKEN, sessionOf({ installationId: 'device-1' })]]) })
      expect(await userResolver({ request: requestWith(TOKEN, { 'x-servable-installation-id': 'device-1' }) })).not.toBeNull()
      expect(await userResolver({ request: requestWith(TOKEN, { 'x-servable-installation-id': 'device-2' }) })).toBeNull()
      expect(await userResolver({ request: requestWith(TOKEN, { 'x-servable-installation-id': 'device-1' }) })).not.toBeNull()
    })

    test('switched off by the environment: every request looks up', async () => {
      process.env.SERVABLE_SESSION_USER_CACHE = 'off'
      const { lookups } = install({ sessionsByToken: new Map([[TOKEN, sessionOf()]]) })
      await userResolver({ request: requestWith(TOKEN) })
      await userResolver({ request: requestWith(TOKEN) })
      expect(lookups.count).toBe(2)
    })

    test('switched off by the app\'s option', async () => {
      const harness = install({ sessionsByToken: new Map([[TOKEN, sessionOf()]]) })
      harness.servable.ServableConfig.configuration.config.server.isSessionUserCacheEnabled = false
      await userResolver({ request: requestWith(TOKEN) })
      await userResolver({ request: requestWith(TOKEN) })
      expect(harness.lookups.count).toBe(2)
    })

    test('off when the engine reports no invalidations', async () => {
      const { lookups } = install({ sessionsByToken: new Map([[TOKEN, sessionOf()]]), isReported: false })
      await userResolver({ request: requestWith(TOKEN) })
      await userResolver({ request: requestWith(TOKEN) })
      expect(lookups.count).toBe(2)
    })

    test('a failed lookup answers no user and is not remembered', async () => {
      const harness = install({ sessionsByToken: new Map([[TOKEN, sessionOf()]]) })
      const firstOfQuery = harness.servable.App.Query.prototype.first
      let isFailing = true
      harness.servable.App.Query.prototype.first = async function () {
        if (isFailing) { harness.lookups.count += 1; throw new Error('MongoDB is down') }
        return firstOfQuery.call(this)
      }
      jest.spyOn(console, 'error').mockImplementation(() => {})
      expect(await userResolver({ request: requestWith(TOKEN) })).toBeNull()
      isFailing = false
      expect((await userResolver({ request: requestWith(TOKEN) })).id).toBe('u1')
      expect(harness.lookups.count).toBe(2)
    })
  })

  describe('Servable.App.SessionInvalidations', () => {
    test('falls back to the contract, which reports nothing', async () => {
      const servable = new ServableClass()
      await servable.hydrate({ servableConfig: {}, engine: { adaptApp: async () => ({}) }, app: {} })
      expect(servable.App.SessionInvalidations).toBe(SessionInvalidationsContract)
      await expect(servable.App.SessionInvalidations.subscribe(() => {})).resolves.toEqual(expect.objectContaining({ isReported: false }))
    })

    test('is the engine\'s own when it has one', async () => {
      const own = { subscribe: async () => ({ isReported: true, unsubscribe: () => {} }) }
      const servable = new ServableClass()
      await servable.hydrate({ servableConfig: {}, engine: { adaptApp: async () => ({ SessionInvalidations: own }) }, app: {} })
      expect(servable.App.SessionInvalidations).toBe(own)
    })
  })
})
