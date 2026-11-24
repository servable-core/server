import { jest } from '@jest/globals'
import registerRoute from '../../src/launch/wireSchema/register/routes/registerItem.js'
import registerService from '../../src/launch/wireSchema/register/services/registerItem.js'
import registerLiveQuery from '../../src/launch/wireSchema/register/livequeries/registerItem.js'
import isRouteDefinable, { reasonRouteIsNotDefined } from '../../src/launch/wireSchema/register/routes/validate.js'
import isServiceRegistrable, { reasonServiceIsNotRegistered } from '../../src/launch/wireSchema/register/services/validate.js'
import isLiveQueryRegistrable, { reasonLiveQueryIsNotRegistered } from '../../src/launch/wireSchema/register/livequeries/validate.js'

// Which routes, services and live queries a protocol's files register (owner's Q1376 a, 2026-11-23). The three tests
// were `async`, so `!validate()` tested a promise, was never true, and everything was registered, `disabled: true`
// included. They are synchronous now, and a service's `register` hook is optional, as Servable.Services treats it.

const handler = async () => ({})
const protocol = { instancesClassesPayloads: () => [] }

beforeEach(() => {
  globalThis.Servable = {
    App: { Route: { define: jest.fn(async () => {}) } },
    Services: { register: jest.fn(async () => {}) },
    LiveQueries: { register: jest.fn(async () => {}) },
  }
  jest.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  delete globalThis.Servable
  jest.restoreAllMocks()
})

describe('the tests are synchronous', () => {
  test('each answers a boolean, never a promise', () => {
    expect(isRouteDefinable({ route: { path: 'a', handler, disabled: true } })).toBe(false)
    expect(isServiceRegistrable({ service: { id: 'a', handler, disabled: true } })).toBe(false)
    expect(isLiveQueryRegistrable({ liveQuery: { id: 'a', query: handler, disabled: true } })).toBe(false)
    expect(isRouteDefinable({ route: { path: 'a', handler } })).toBe(true)
    expect(isServiceRegistrable({ service: { id: 'a', handler } })).toBe(true)
    expect(isLiveQueryRegistrable({ liveQuery: { id: 'a', query: handler } })).toBe(true)
  })

  test('and say why an export is left out', () => {
    expect(reasonRouteIsNotDefined({ route: undefined })).toBe('its file exports no route')
    expect(reasonRouteIsNotDefined({ route: () => {} })).toBe('its file exports no route')
    expect(reasonRouteIsNotDefined({ route: { path: 'a' } })).toBe('it has no handler')
    expect(reasonRouteIsNotDefined({ route: { path: 'a', handler, disabled: true } })).toBe('it is disabled')
    expect(reasonServiceIsNotRegistered({ service: { id: 'a' } })).toBe('it has no handler')
    expect(reasonLiveQueryIsNotRegistered({ liveQuery: { id: 'a' } })).toBe('it has no query')
  })
})

describe('a route', () => {
  test('disabled is not defined, and the boot says so', async () => {
    await registerRoute({ route: { method: 'get', path: 'v1/old', handler, disabled: true }, protocol, prefix: 'v1' })
    expect(Servable.App.Route.define).not.toHaveBeenCalled()
    expect(console.info.mock.calls.join(' ')).toContain('v1/old is not defined: it is disabled')
  })

  test('with no handler, or a file exporting none, is not defined', async () => {
    await registerRoute({ route: { method: 'get', path: 'v1/empty' }, protocol })
    await registerRoute({ route: undefined, protocol })
    expect(Servable.App.Route.define).not.toHaveBeenCalled()
  })

  test('with a handler is defined, its path lowercased', async () => {
    await registerRoute({ route: { method: 'get', path: 'v1/Feed', handler }, protocol, prefix: 'v1' })
    expect(Servable.App.Route.define).toHaveBeenCalledTimes(1)
    expect(Servable.App.Route.define.mock.calls[0][0]).toMatchObject({ method: 'get', path: 'v1/feed', prefix: 'v1', handler })
  })

  test('disabled: false is defined', async () => {
    await registerRoute({ route: { method: 'get', path: 'v1/on', handler, disabled: false }, protocol })
    expect(Servable.App.Route.define).toHaveBeenCalledTimes(1)
  })
})

describe('a service', () => {
  test('with a handler and no register hook is registered (every service of backend/main has this shape)', async () => {
    const service = { id: '@adoucoure/searchable/collection/update', handler }
    await registerService({ service, protocol })
    expect(Servable.Services.register).toHaveBeenCalledWith({ service, protocol })
  })

  test('disabled, or with no handler, or a helper file exporting none, is not registered', async () => {
    await registerService({ service: { id: 'off', handler, disabled: true }, protocol })
    await registerService({ service: { id: 'no-handler', register: handler }, protocol })
    await registerService({ service: () => {}, protocol })
    await registerService({ service: undefined, protocol })
    expect(Servable.Services.register).not.toHaveBeenCalled()
    const logged = console.info.mock.calls.join(' ')
    expect(logged).toContain('off is not registered: it is disabled')
    expect(logged).toContain('no-handler is not registered: it has no handler')
  })
})

describe('a live query', () => {
  test('with a query is registered', async () => {
    const liveQuery = { id: 'feed', query: async () => ({}) }
    await registerLiveQuery({ liveQuery, protocol })
    expect(Servable.LiveQueries.register).toHaveBeenCalledWith({ liveQuery, protocol })
  })

  test('disabled, or with no query, is not registered', async () => {
    await registerLiveQuery({ liveQuery: { id: 'off', query: handler, disabled: true }, protocol })
    await registerLiveQuery({ liveQuery: { id: 'no-query' }, protocol })
    expect(Servable.LiveQueries.register).not.toHaveBeenCalled()
  })
})
