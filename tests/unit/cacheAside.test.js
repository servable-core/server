import { jest } from '@jest/globals'
import CacheAside, { cacheAside, forgetCachedKey, registerCacheClient } from '../../src/lib/cacheAside/index.js'

const makeClient = () => ({ get: jest.fn(async () => null), set: jest.fn(async () => 'OK'), del: jest.fn(async () => 1) })

describe('cacheAside', () => {
  let client
  beforeEach(() => {
    client = makeClient()
    registerCacheClient(async () => client)
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    registerCacheClient(null)
    jest.restoreAllMocks()
  })

  it('a hit answers from the cache and does not load or write', async () => {
    client.get.mockResolvedValue(JSON.stringify({ value: { a: 1 } }))
    const load = jest.fn()
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load })).toEqual({ a: 1 })
    expect(load).not.toHaveBeenCalled()
    expect(client.set).not.toHaveBeenCalled()
  })

  it('a miss loads and writes once with a fixed EX option', async () => {
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => ({ a: 1 }) })).toEqual({ a: 1 })
    expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ value: { a: 1 } }), { EX: 60 })
  })

  it('a hit never renews the time to live', async () => {
    client.expire = jest.fn()
    client.get.mockResolvedValue(JSON.stringify({ value: 1 }))
    await cacheAside({ key: 'k', ttlSeconds: 60, load: jest.fn() })
    expect(client.expire).not.toHaveBeenCalled()
    expect(client.set).not.toHaveBeenCalled()
  })

  it('a null answer is cached and a cached null is a hit', async () => {
    await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => null })
    expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ value: null }), { EX: 60 })
    client.get.mockResolvedValue(JSON.stringify({ value: null }))
    const load = jest.fn()
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load })).toBeNull()
    expect(load).not.toHaveBeenCalled()
  })

  it('an undefined answer is stored as null', async () => {
    await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => undefined })
    expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ value: null }), { EX: 60 })
  })

  it('a failed load is never cached and its error reaches the caller', async () => {
    const failure = new Error('down')
    await expect(cacheAside({ key: 'k', ttlSeconds: 60, load: async () => { throw failure } })).rejects.toBe(failure)
    expect(client.set).not.toHaveBeenCalled()
  })

  it('fails open when reading or writing throws', async () => {
    client.get.mockRejectedValue(new Error('down'))
    client.set.mockRejectedValue(new Error('down'))
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => 'v' })).toBe('v')
  })

  it('fails open on a garbage stored value', async () => {
    client.get.mockResolvedValue('not json')
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => 'v' })).toBe('v')
    client.get.mockResolvedValue(JSON.stringify({ nope: 1 }))
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => 'w' })).toBe('w')
  })

  it('fails open when no client is registered, or the client answers null', async () => {
    registerCacheClient(null)
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => 'v' })).toBe('v')
    registerCacheClient(async () => null)
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => 'v' })).toBe('v')
  })

  it('fails open when the client getter throws', async () => {
    registerCacheClient(async () => { throw new Error('boom') })
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => 'v' })).toBe('v')
  })

  it('fails open when Redis does not answer in time', async () => {
    registerCacheClient(async () => ({ get: () => new Promise(() => {}), set: () => new Promise(() => {}) }), { timeoutMs: 20 })
    expect(await cacheAside({ key: 'k', ttlSeconds: 60, load: async () => 'v' })).toBe('v')
  })

  it('refuses a bad call', async () => {
    await expect(cacheAside({ key: '', ttlSeconds: 60, load: async () => 1 })).rejects.toThrow()
    await expect(cacheAside({ key: 'k', ttlSeconds: 0, load: async () => 1 })).rejects.toThrow()
    await expect(cacheAside({ key: 'k', ttlSeconds: 60 })).rejects.toThrow()
    expect(() => registerCacheClient('nope')).toThrow()
  })

  it('forgetCachedKey deletes the key and reports it', async () => {
    expect(await forgetCachedKey('k')).toBe(true)
    expect(client.del).toHaveBeenCalledWith('k')
  })

  it('forgetCachedKey never throws and reports false when Redis fails or is absent', async () => {
    client.del.mockRejectedValue(new Error('down'))
    expect(await forgetCachedKey('k')).toBe(false)
    registerCacheClient(null)
    expect(await forgetCachedKey('k')).toBe(false)
  })

  it('exposes the same functions as the default export', () => {
    expect(CacheAside.cacheAside).toBe(cacheAside)
  })
})
