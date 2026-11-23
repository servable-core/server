import { jest } from '@jest/globals'
import ServableClass from '../../src/domain/servable/index.js'
import IndexesContract from '../../src/domain/servable/indexes/index.js'

// Servable.App.Indexes is never undefined: the engine's own when it has one, else the contract's fallback, which makes
// nothing and says so (src/domain/servable/indexes/index.js).

const hydratedWith = async (app) => {
  const servable = new ServableClass()
  const engine = { adaptApp: async () => app }
  await servable.hydrate({ servableConfig: {}, engine, app: {} })
  return servable
}

describe('Servable.App.Indexes', () => {
  test('is the engine\'s own when it has one', async () => {
    const ensure = async () => ({ isEnsured: true, className: 'A', name: 'i' })
    const servable = await hydratedWith({ Indexes: { ensure } })
    expect(servable.App.Indexes.ensure).toBe(ensure)
  })

  test('falls back to the contract, which makes nothing, never throws and says why', async () => {
    const servable = await hydratedWith({})
    expect(servable.App.Indexes).toBe(IndexesContract)
    jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(servable.App.Indexes.ensure({ className: 'A', name: 'i', keys: { a: 1 } }))
      .resolves.toEqual({ isEnsured: false, className: 'A', name: 'i', reason: expect.stringMatching(/cannot make indexes/) })
    expect(console.error).toHaveBeenCalledTimes(1)
    console.error.mockRestore()
  })
})
