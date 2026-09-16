import { jest } from '@jest/globals'
import BootState from '../../src/lib/stateStore/bootStateEnum.js'
import { memoryStore } from './runTracked.test.js'

// Auto seeds record their hash through the engine state store (utilless) instead of a mongoose
// document in the utils database. seedEntry (the Parse writes) is mocked.
const mockSeedEntry = jest.fn()
jest.unstable_mockModule('../../src/launch/seed/handleProtocol/auto/seedEntry/index.js', () => ({
  __esModule: true,
  default: (...args) => mockSeedEntry(...args),
}))

const { default: seedAuto } = await import('../../src/launch/seed/handleProtocol/auto/index.js')

const protocol = (data) => ({
  mode: 'auto',
  type: 'class',
  id: 'genre',
  files: { data, transformer: (entry) => entry },
})

describe('seed auto handler (utilless boot state)', () => {
  beforeEach(() => mockSeedEntry.mockReset())

  test('seeds every entry once, then skips on the next boot with unchanged data', async () => {
    const store = memoryStore()

    await seedAuto({ protocol: protocol([{ name: 'a' }, { name: 'b' }]), stateStore: store })
    await seedAuto({ protocol: protocol([{ name: 'a' }, { name: 'b' }]), stateStore: store })

    expect(mockSeedEntry).toHaveBeenCalledTimes(2)
    expect(store.rows.get('seed|class|genre')).toMatchObject({
      state: BootState.LoadedSuccessfully, dataCount: 2, mode: 'auto',
    })
  })

  test('changed seed data runs again', async () => {
    const store = memoryStore()

    await seedAuto({ protocol: protocol([{ name: 'a' }]), stateStore: store })
    await seedAuto({ protocol: protocol([{ name: 'a' }, { name: 'c' }]), stateStore: store })

    expect(mockSeedEntry).toHaveBeenCalledTimes(3)
    expect(store.rows.get('seed|class|genre').dataCount).toBe(2)
  })

  test('no data or no transformer: nothing seeded, nothing recorded', async () => {
    const store = memoryStore()

    await seedAuto({ protocol: { ...protocol(undefined) }, stateStore: store })

    expect(mockSeedEntry).not.toHaveBeenCalled()
    expect(store.bootState.get).not.toHaveBeenCalled()
    expect(store.bootState.save).not.toHaveBeenCalled()
  })
})
