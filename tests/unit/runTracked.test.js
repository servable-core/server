import { jest } from '@jest/globals'
import runTracked from '../../src/lib/stateStore/runTracked.js'
import BootState from '../../src/lib/stateStore/bootStateEnum.js'

// In-memory stand-in for an engine state store - only bootState matters here.
export const memoryStore = () => {
  const rows = new Map()
  const id = ({ kind, type, entityId }) => `${kind}|${type}|${entityId}`
  const store = {
    rows,
    schemaState: { get: async () => null, recordApplied: async () => ({}) },
    bootState: {
      get: jest.fn(async (key) => rows.get(id(key)) ?? null),
      save: jest.fn(async ({ fields, ...key }) => {
        const row = { ...(rows.get(id(key)) || {}), ...fields, type: key.type, entityId: key.entityId }
        rows.set(id(key), row)
        return row
      }),
    },
  }
  return store
}

const key = { kind: 'seed', type: 'class', entityId: 'genre' }

describe('runTracked (seed/config boot state)', () => {
  test('first run records Loading, runs, then LoadedSuccessfully with the hash and extra fields', async () => {
    const store = memoryStore()
    const run = jest.fn(async () => ({ fields: { dataCount: 3 } }))

    const result = await runTracked({ stateStore: store, ...key, mode: 'auto', dataSHA: 'S1', run })

    expect(result).toEqual({ skipped: false, completed: true })
    expect(run).toHaveBeenCalledTimes(1)
    expect(store.bootState.save.mock.calls[0][0].fields.state).toBe(BootState.Loading)
    expect(store.bootState.get.mock.calls[0][0]).toEqual(key)
    expect(store.rows.get('seed|class|genre')).toMatchObject({
      state: BootState.LoadedSuccessfully, dataSHA: 'S1', dataCount: 3, mode: 'auto',
    })
  })

  test('same hash already loaded: skips without running or writing', async () => {
    const store = memoryStore()
    await runTracked({ stateStore: store, ...key, dataSHA: 'S1', run: async () => {} })
    store.bootState.save.mockClear()
    const run = jest.fn()

    const result = await runTracked({ stateStore: store, ...key, dataSHA: 'S1', run })

    expect(result).toEqual({ skipped: true })
    expect(run).not.toHaveBeenCalled()
    expect(store.bootState.save).not.toHaveBeenCalled()
  })

  test('changed hash: runs again and records the new hash', async () => {
    const store = memoryStore()
    await runTracked({ stateStore: store, ...key, dataSHA: 'S1', run: async () => {} })
    const run = jest.fn(async () => {})

    await runTracked({ stateStore: store, ...key, dataSHA: 'S2', run })

    expect(run).toHaveBeenCalledTimes(1)
    expect(store.rows.get('seed|class|genre').dataSHA).toBe('S2')
  })

  test('left in Loading by a pod that died mid-run: runs again even with the same hash', async () => {
    const store = memoryStore()
    store.rows.set('seed|class|genre', { state: BootState.Loading, dataSHA: 'S1' })
    const run = jest.fn(async () => {})

    await runTracked({ stateStore: store, ...key, dataSHA: 'S1', run })

    expect(run).toHaveBeenCalledTimes(1)
  })

  test('run throws: records ErrorLoading and rethrows the original error', async () => {
    const store = memoryStore()
    const boom = new Error('seed failed')

    await expect(runTracked({ stateStore: store, ...key, dataSHA: 'S1', run: async () => { throw boom } }))
      .rejects.toBe(boom)

    expect(store.rows.get('seed|class|genre')).toMatchObject({ state: BootState.ErrorLoading })
    expect(store.rows.get('seed|class|genre').dataSHA).toBeUndefined()
  })

  test('a failing ErrorLoading write does not mask the original error', async () => {
    const store = memoryStore()
    const boom = new Error('seed failed')
    store.bootState.save
      .mockImplementationOnce(async () => ({}))
      .mockImplementationOnce(async () => { throw new Error('store down') })
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(runTracked({ stateStore: store, ...key, dataSHA: 'S1', run: async () => { throw boom } }))
      .rejects.toBe(boom)

    consoleError.mockRestore()
  })

  test('run resolving { completed: false } stays Loading and records no hash', async () => {
    const store = memoryStore()

    const result = await runTracked({ stateStore: store, ...key, dataSHA: 'S1', run: async () => ({ completed: false }) })

    expect(result).toEqual({ skipped: false, completed: false })
    expect(store.rows.get('seed|class|genre')).toMatchObject({ state: BootState.Loading })
    expect(store.rows.get('seed|class|genre').dataSHA).toBeUndefined()
  })
})
