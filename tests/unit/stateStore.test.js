import resolveStateStore, { assertStateStore } from '../../src/lib/stateStore/index.js'

const validStore = () => ({
  schemaState: { get: async () => null, recordApplied: async () => ({}) },
  bootState: { get: async () => null, save: async () => ({}) },
})

describe('resolveStateStore (utilless engine contract)', () => {
  test('returns the store the engine creates, passing servableConfig through', async () => {
    const store = validStore()
    const servableConfig = { envs: { databaseURI: 'mongodb://x' } }
    const engine = { createStateStore: async (props) => ({ ...store, received: props }) }

    const resolved = await resolveStateStore({ servableConfig, engine })

    expect(resolved.received).toEqual({ servableConfig })
    expect(typeof resolved.schemaState.recordApplied).toBe('function')
  })

  test('fails closed when the engine has no createStateStore (no silent no-op floor guard)', async () => {
    await expect(resolveStateStore({ servableConfig: {}, engine: {} }))
      .rejects.toThrow(/does not implement createStateStore/)
  })

  test('fails closed when the engine store is missing a required operation', async () => {
    const store = validStore()
    delete store.schemaState.recordApplied
    const engine = { createStateStore: async () => store }

    await expect(resolveStateStore({ servableConfig: {}, engine }))
      .rejects.toThrow(/schemaState\.recordApplied/)
  })

  test('surfaces the engine error when the store cannot be created (e.g. database unreachable)', async () => {
    const engine = { createStateStore: async () => { throw new Error('connect ECONNREFUSED') } }

    await expect(resolveStateStore({ servableConfig: {}, engine })).rejects.toThrow(/ECONNREFUSED/)
  })

  test('assertStateStore lists every missing operation', () => {
    expect(() => assertStateStore({})).toThrow(
      /schemaState\.get, schemaState\.recordApplied, bootState\.get, bootState\.save/
    )
  })
})
