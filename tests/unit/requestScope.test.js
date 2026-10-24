import { jest } from '@jest/globals'
import http from 'node:http'
import { EventEmitter } from 'node:events'
import RequestScope, { requestMemo, createBatchLoader, runInNewRequestScope, runInRequestScopeOf, RequestAbortedError } from '../../src/lib/requestScope/index.js'
import { wrapRouteDefinition } from '../../src/lib/requestScope/wrapRouteDefinition.js'

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

describe('request abort signal', () => {
  const buildFakeResponse = () => {
    const response = new EventEmitter()
    response.writableEnded = false
    return response
  }
  const runWith = async ({ response, work }) => {
    const nativeRequest = { res: response }
    return runInRequestScopeOf({ nativeRequest, work })
  }

  it('is undefined / false outside a request', () => {
    expect(RequestScope.requestSignal()).toBeUndefined()
    expect(RequestScope.isRequestAborted()).toBe(false)
    expect(() => RequestScope.throwIfRequestAborted()).not.toThrow()
  })

  it('does not abort when the response finished before close', async () => {
    const response = buildFakeResponse()
    let signal
    await runWith({ response, work: async () => { signal = RequestScope.requestSignal() } })
    response.writableEnded = true
    response.emit('close')
    expect(signal.aborted).toBe(false)
  })

  it('aborts when the connection closes before the response ended', async () => {
    const response = buildFakeResponse()
    await runWith({
      response,
      work: async () => {
        expect(RequestScope.isRequestAborted()).toBe(false)
        response.emit('close')
        expect(RequestScope.isRequestAborted()).toBe(true)
        expect(RequestScope.requestSignal().aborted).toBe(true)
        expect(() => RequestScope.throwIfRequestAborted()).toThrow(RequestAbortedError)
      },
    })
  })

  it('re-entering the same request sees the same signal, another request does not', async () => {
    const response = buildFakeResponse()
    const nativeRequest = { res: response }
    const signals = []
    await runInRequestScopeOf({ nativeRequest, work: async () => signals.push(RequestScope.requestSignal()) })
    await runInRequestScopeOf({ nativeRequest, work: async () => signals.push(RequestScope.requestSignal()) })
    await runInRequestScopeOf({ nativeRequest: { res: buildFakeResponse() }, work: async () => signals.push(RequestScope.requestSignal()) })
    expect(signals[0]).toBe(signals[1])
    expect(signals[2]).not.toBe(signals[0])
  })

  it('RequestAbortedError has a stable name and flag', () => {
    const error = new RequestAbortedError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('RequestAbortedError')
    expect(error.isRequestAborted).toBe(true)
  })

  it('a real http server: finished response does not abort, closed client does', async () => {
    let finishedSignal
    let abortedSignal
    const server = http.createServer((request, response) => {
      // Express sets request.res; a bare http server does not.
      request.res = response
      runInRequestScopeOf({
        nativeRequest: request,
        work: async () => {
          if (request.url === '/finish') {
            finishedSignal = RequestScope.requestSignal()
            response.end('ok')
          } else {
            abortedSignal = RequestScope.requestSignal()
            // never answers
          }
        },
      })
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    await new Promise((resolve) => http.get({ port, host: '127.0.0.1', path: '/finish' }, (res) => { res.resume(); res.on('end', resolve) }))
    await nextTick()
    expect(finishedSignal.aborted).toBe(false)
    const clientRequest = http.get({ port, host: '127.0.0.1', path: '/hang' })
    clientRequest.on('error', () => {})
    await new Promise((resolve) => setTimeout(resolve, 50))
    clientRequest.destroy()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(abortedSignal.aborted).toBe(true)
    await new Promise((resolve) => server.close(resolve))
  })
})

describe('wrapRouteDefinition quiet drop', () => {
  it('swallows RequestAbortedError from the handler, rethrows other errors', async () => {
    const abortedRoute = wrapRouteDefinition({ handler: async () => { throw new RequestAbortedError() } })
    await expect(abortedRoute.handler({ native: {} })).resolves.toBeUndefined()
    const syncAbortedRoute = wrapRouteDefinition({ handler: () => { throw new RequestAbortedError() } })
    await expect(syncAbortedRoute.handler({ native: {} })).resolves.toBeUndefined()
    const brokenRoute = wrapRouteDefinition({ handler: async () => { throw new Error('boom') } })
    await expect(brokenRoute.handler({ native: {} })).rejects.toThrow('boom')
    const goodRoute = wrapRouteDefinition({ handler: async () => 'fine' })
    await expect(goodRoute.handler({ native: {} })).resolves.toBe('fine')
  })

  it('exposes the signal inside the handler and aborts it when the response closes', async () => {
    const response = new EventEmitter()
    response.writableEnded = false
    const route = wrapRouteDefinition({
      handler: async () => { response.emit('close'); return RequestScope.isRequestAborted() },
    })
    await expect(route.handler({ native: { request: { res: response }, response } })).resolves.toBe(true)
  })
})
