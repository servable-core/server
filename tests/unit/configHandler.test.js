import { jest } from '@jest/globals'
import BootState from '../../src/lib/stateStore/bootStateEnum.js'
import { memoryStore } from './runTracked.test.js'

// servableconfigurable config loading records its hash through the engine state store (utilless).
// The Parse-writing collaborators are mocked.
const mockValidate = jest.fn()
const mockServableConfig = jest.fn()
const passThrough = (...args) => args[0].item

jest.unstable_mockModule('../../src/lib/config/validate/protocol/index.js', () => ({
  __esModule: true,
  default: (...args) => mockValidate(...args),
}))
jest.unstable_mockModule('../../src/launch/config/handleProtocol/servableConfig/index.js', () => ({
  __esModule: true,
  default: (...args) => mockServableConfig(...args),
}))
for (const name of ['servableConfigCondition', 'servableConfigGroup', 'servableConfigEntry']) {
  jest.unstable_mockModule(`../../src/launch/config/handleProtocol/${name}/index.js`, () => ({
    __esModule: true,
    default: passThrough,
  }))
}

const { default: handleConfig } = await import('../../src/launch/config/handleProtocol/index.js')

const candidate = (entries = [{ key: 'defaultLocale' }]) => ({
  mode: 'auto',
  type: 'protocol',
  id: 'countryable',
  protocol: { id: 'countryable' },
  files: { conditions: [], groups: [], entries },
})

const parseObject = () => ({ set: jest.fn(), save: jest.fn(async () => {}) })

describe('config handler (utilless boot state)', () => {
  beforeEach(() => {
    mockValidate.mockReset().mockResolvedValue({ isValid: true })
    mockServableConfig.mockReset().mockImplementation(async () => parseObject())
  })

  test('loads once and records LoadedSuccessfully, then skips on the next boot with unchanged files', async () => {
    const store = memoryStore()

    await handleConfig({ candidate: candidate(), stateStore: store })
    await handleConfig({ candidate: candidate(), stateStore: store })

    expect(mockServableConfig).toHaveBeenCalledTimes(1)
    expect(store.rows.get('config|protocol|countryable')).toMatchObject({ state: BootState.LoadedSuccessfully })
  })

  test('invalid config throws a real Error (was a ReferenceError from `new error(...)`)', async () => {
    mockValidate.mockResolvedValue({ isValid: false, message: 'missing entries' })

    await expect(handleConfig({ candidate: candidate(), stateStore: memoryStore() }))
      .rejects.toThrow('The config is not valid missing entries')
  })

  test('no ServableConfig object resolved: stays Loading so the next boot retries', async () => {
    const store = memoryStore()
    mockServableConfig.mockResolvedValue(null)

    await handleConfig({ candidate: candidate(), stateStore: store })

    expect(store.rows.get('config|protocol|countryable')).toMatchObject({ state: BootState.Loading })
  })
})
