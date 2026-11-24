import { jest } from '@jest/globals'
import {
  createSessionUserCache,
  resetSessionUserCacheOfThisProcessForTests,
} from '../../src/lib/sessionUserCache/index.js'
import userResolver from '../../src/launch/wireSchema/register/routes/utils/userResolver.js'

// Production proof 3.5 (.docs/technical/production-proof-instrumentation-2026-11-23.md): how each request's session was found and
// what the session-user cache did, counted through Servable.App.Metrics, with labels from closed lists only.

const TOKEN = 'r:0123456789abcdef0123456789abcdef'

class FakeUser {
  constructor (json = {}) { this.className = '_User'; this.id = json.objectId; this.attributes = { name: json.name } }
  get (key) { return this.attributes[key] }
  toJSON () { return { objectId: this.id, ...this.attributes } }
  static fromJSON (json) { return new FakeUser(JSON.parse(JSON.stringify(json))) }
}
const sessionOf = ({ installationId = null } = {}) => {
  const fields = { user: new FakeUser({ objectId: 'u1', name: 'Ada' }), expiresAt: new Date(Date.now() + 3600000), installationId, createdWith: { action: 'login' } }
  return { id: 's1', get: (key) => fields[key] }
}

// Servable.App.Metrics that keeps every value recorded.
const recordingMetrics = () => {
  const recorded = []
  const instrument = (kind) => (name) => ({
    add: (value, attributes) => recorded.push({ kind, name, value, attributes }),
    set: (value, attributes) => recorded.push({ kind, name, value, attributes }),
  })
  return { recorded, counter: instrument('counter'), gauge: instrument('gauge'), histogram: instrument('histogram') }
}

const servableWith = ({ sessionsByToken, metrics }) => {
  let listener = null
  class Query {
    constructor () { this.conditions = {} }
    equalTo (key, value) { this.conditions[key] = value; return this }
    greaterThan () { return this }
    include () { return this }
    async first () { return sessionsByToken.get(this.conditions.sessionToken) ?? undefined }
  }
  return {
    servable: {
      ServableConfig: { configuration: { config: { server: {} } } },
      App: {
        Query,
        Metrics: metrics,
        SessionInvalidations: { subscribe: async (newListener) => { listener = newListener; return { isReported: true, unsubscribe: () => {} } } },
      },
    },
    report: (invalidation) => listener?.(invalidation),
  }
}
const requestWith = (token, headers = {}) => ({ headers: { ...(token ? { 'x-servable-session-token': token } : {}), ...headers } })

describe('session resolutions, counted', () => {
  const originalEnv = { ...process.env }
  let metrics
  beforeEach(() => {
    resetSessionUserCacheOfThisProcessForTests()
    delete process.env.AUTH_JWT_SECRET
    delete process.env.SERVABLE_SESSION_USER_CACHE
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    metrics = recordingMetrics()
  })
  afterEach(() => {
    process.env = { ...originalEnv }
    delete globalThis.Servable
    jest.restoreAllMocks()
  })
  const resolutions = () => metrics.recorded.filter(({ name }) => name === 'servable_session_resolutions_total').map(({ attributes }) => attributes)

  test('a first lookup from _Session, then the cache (the healthy path); no token says so; no token or digest in a label', async () => {
    globalThis.Servable = servableWith({ sessionsByToken: new Map([[TOKEN, sessionOf()]]), metrics }).servable
    await userResolver({ request: requestWith(TOKEN) })
    await userResolver({ request: requestWith(TOKEN) })
    await userResolver({ request: requestWith(null) })
    expect(resolutions()).toEqual([
      { path: 'session_query', result: 'user' },
      { path: 'cache', result: 'user' },
      { path: 'no_token', result: 'none' },
    ])
    expect(metrics.recorded.filter(({ name }) => name === 'servable_session_user_cache_remembered_total').map(({ attributes }) => attributes))
      .toEqual([{ outcome: 'stored' }])
    expect(JSON.stringify(metrics.recorded)).not.toMatch(/0123456789abcdef/)
  })

  test('a token that opens nothing, and a device that does not match, are counted (the alarm paths)', async () => {
    globalThis.Servable = servableWith({ sessionsByToken: new Map([['r:other', sessionOf({ installationId: 'device-1' })]]), metrics }).servable
    await userResolver({ request: requestWith(TOKEN) })
    await userResolver({ request: requestWith('r:other', { 'x-servable-installation-id': 'device-2' }) })
    expect(resolutions()).toEqual([
      { path: 'session_query', result: 'none' },
      { path: 'session_query', result: 'device_mismatch' },
    ])
  })

  test('without Servable.App.Metrics the package\'s own is used and nothing throws', async () => {
    const { servable } = servableWith({ sessionsByToken: new Map([[TOKEN, sessionOf()]]), metrics })
    delete servable.App.Metrics
    globalThis.Servable = servable
    expect((await userResolver({ request: requestWith(TOKEN) })).id).toBe('u1')
  })
})

describe('the session-user cache, counted', () => {
  const signalsRecorded = () => {
    const recorded = []
    return { recorded, signals: { remembered: (outcome) => recorded.push(['remembered', outcome]), invalidated: (kind) => recorded.push(['invalidated', kind]), sized: (size) => recorded.push(['sized', size]) } }
  }
  const session = { sessionId: 's1', userId: 'u1', expiresAtMilliseconds: Date.now() + 3600000, userSnapshot: {} }

  test('stored, refused after an invalidation, refused invalid; each invalidation by kind; the size after each change', () => {
    const { recorded, signals } = signalsRecorded()
    const cache = createSessionUserCache({ ttlMilliseconds: 10000, maxEntries: 10, signals })
    cache.remember('h1', session, { invalidationCountAtStart: 0 })
    cache.forget({ sessionToken: TOKEN, userId: 'u1' })
    cache.remember('h2', session, { invalidationCountAtStart: 0 })
    cache.remember('h3', { ...session, userSnapshot: null }, { invalidationCountAtStart: 1 })
    cache.forget({ isEverything: true })
    expect(recorded).toEqual([
      ['remembered', 'stored'], ['sized', 1],
      ['invalidated', 'token'], ['invalidated', 'user'], ['sized', 0],
      ['remembered', 'refused_invalidated'],
      ['remembered', 'refused_invalid'],
      ['invalidated', 'everything'], ['sized', 0],
    ])
  })
})
