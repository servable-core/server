import { jest } from '@jest/globals'
import RequestScope, { requestMemo, createBatchLoader, runInNewRequestScope, runInRequestScopeOf } from '../../src/lib/requestScope/index.js'

const nextTick = () => new Promise((resolve) => setImmediate(resolve))

describe('requestMemo', () => {
  it('shares one load between concurrent callers', async () => {
    let loadCount = 0
    const load = async () => { loadCount += 1; await nextTick(); return 'value' }
    await runInNewRequestScope(async () => {
      const results = await Promise.all([
        requestMemo({ key: 'k', load }),
        requestMemo({ key: 'k', load }),
        requestMemo({ key: 'k', load }),
      ])
      expect(results).toEqual(['value', 'value', 'value'])
      await requestMemo({ key: 'k', load })
    })
    expect(loadCount).toBe(1)
  })

  it('does not keep a failed load', async () => {
    let loadCount = 0
    const load = async () => { loadCount += 1; if (loadCount === 1) throw new Error('boom'); return 'ok' }
    await runInNewRequestScope(async () => {
      await expect(requestMemo({ key: 'k', load })).rejects.toThrow('boom')
      await nextTick()
      await expect(requestMemo({ key: 'k', load })).resolves.toBe('ok')
    })
    expect(loadCount).toBe(2)
  })

  it('never shares between two requests', async () => {
    let loadCount = 0
    const load = async () => { loadCount += 1; return loadCount }
    const first = await runInNewRequestScope(() => requestMemo({ key: 'k', load }))
    const second = await runInNewRequestScope(() => requestMemo({ key: 'k', load }))
    expect([first, second]).toEqual([1, 2])
  })

  it('keeps concurrent requests apart', async () => {
    const load = (label) => async () => { await nextTick(); return label }
    const [a, b] = await Promise.all([
      runInNewRequestScope(() => requestMemo({ key: 'k', load: load('a') })),
      runInNewRequestScope(() => requestMemo({ key: 'k', load: load('b') })),
    ])
    expect([a, b]).toEqual(['a', 'b'])
  })

  it('outside a request loads every time and keeps nothing', async () => {
    let loadCount = 0
    const load = async () => { loadCount += 1; return loadCount }
    expect(RequestScope.hasRequestScope()).toBe(false)
    expect(await requestMemo({ key: 'k', load })).toBe(1)
    expect(await requestMemo({ key: 'k', load })).toBe(2)
  })

  it('re-enters the scope of the same native request', async () => {
    const nativeRequest = {}
    let loadCount = 0
    const load = async () => { loadCount += 1; return loadCount }
    await runInRequestScopeOf({ nativeRequest, work: () => requestMemo({ key: 'k', load }) })
    await runInRequestScopeOf({ nativeRequest, work: () => requestMemo({ key: 'k', load }) })
    expect(loadCount).toBe(1)
  })
})

describe('createBatchLoader', () => {
  it('batches ids asked in the same tick into one call', async () => {
    const batchLoad = jest.fn(async (ids) => new Map(ids.map((id) => [id, `v${id}`])))
    await runInNewRequestScope(async () => {
      const loader = createBatchLoader({ name: 'books', batchLoad })
      const values = await Promise.all([loader.load('1'), loader.load('2'), loader.load('1'), loader.load('3')])
      expect(values).toEqual(['v1', 'v2', 'v1', 'v3'])
    })
    expect(batchLoad).toHaveBeenCalledTimes(1)
    expect(batchLoad).toHaveBeenCalledWith(['1', '2', '3'])
  })

  it('splits into chunks of maxBatchSize and maps array results by position', async () => {
    const batchLoad = jest.fn(async (ids) => ids.map((id) => `v${id}`))
    await runInNewRequestScope(async () => {
      const loader = createBatchLoader({ name: 'x', batchLoad, maxBatchSize: 2 })
      expect(await loader.loadMany(['1', '2', '3'])).toEqual(['v1', 'v2', 'v3'])
    })
    expect(batchLoad).toHaveBeenCalledTimes(2)
  })

  it('resolves undefined for a missing id and rejects all on failure without keeping it', async () => {
    let shouldFail = true
    const batchLoad = jest.fn(async (ids) => { if (shouldFail) throw new Error('down'); return {} })
    await runInNewRequestScope(async () => {
      const loader = createBatchLoader({ name: 'x', batchLoad })
      await expect(loader.load('1')).rejects.toThrow('down')
      shouldFail = false
      await expect(loader.load('1')).resolves.toBeUndefined()
    })
  })

  it('returns the same loader for a name within a request, a different one in another', async () => {
    const batchLoad = async (ids) => ids
    let first
    await runInNewRequestScope(async () => {
      first = createBatchLoader({ name: 'n', batchLoad })
      expect(createBatchLoader({ name: 'n', batchLoad })).toBe(first)
    })
    await runInNewRequestScope(async () => {
      expect(createBatchLoader({ name: 'n', batchLoad })).not.toBe(first)
    })
  })

  it('outside a request gives a throwaway loader that still batches', async () => {
    const batchLoad = jest.fn(async (ids) => ids.map((id) => id))
    const loader = createBatchLoader({ name: 'n', batchLoad })
    await Promise.all([loader.load('a'), loader.load('b')])
    expect(batchLoad).toHaveBeenCalledTimes(1)
    expect(createBatchLoader({ name: 'n', batchLoad })).not.toBe(loader)
  })
})

describe('route definition wrapping', () => {
  it('runs the handler and the user resolver in one scope per native request, even after the context is lost', async () => {
    const { wrapRouteDefine } = await import('../../src/lib/requestScope/wrapRouteDefinition.js')
    let definedOptions
    const Route = { define: (options) => { definedOptions = options } }
    let loadCount = 0
    const load = async () => { loadCount += 1; return loadCount }
    Route.define({
      method: 'get',
      path: 'x',
      servableArguments: async () => ({ userResolver: async () => requestMemo({ key: 'user', load }) }),
      handler: async () => requestMemo({ key: 'user', load }),
    })
    // not wrapped yet
    wrapRouteDefine({ Route })
    wrapRouteDefine({ Route })
    Route.define({
      method: 'get',
      path: 'x',
      servableArguments: async () => ({ userResolver: async () => requestMemo({ key: 'user', load }) }),
      handler: async () => requestMemo({ key: 'user', load }),
    })
    const nativeRequest = {}
    const native = { request: nativeRequest }
    const { userResolver } = await definedOptions.servableArguments({ native })
    const user = await userResolver()
    // Outside any async context, as after a body parser.
    const handled = await definedOptions.handler({ native })
    expect([user, handled]).toEqual([1, 1])
    const otherHandled = await definedOptions.handler({ native: { request: {} } })
    expect(otherHandled).toBe(2)
  })
})
