import { jest } from '@jest/globals'

// checkSchemaCompatibility.js talks to two things this test replaces: the engine state store
// (utilless - passed in, so a plain fake object) and @servable/tools' normalizeArtifact (mocked
// with jest.unstable_mockModule + a dynamic import of the module under test, so the mock is
// captured before any of its own imports run). No real MongoDB involved - the store's atomic floor
// update is covered against a real MongoDB in @servable/parse-server-engine's
// tests/integration/stateStore.test.js.
//
// Each test below is one scenario from the "A/B pod in production" walkthrough
// (.docs/technical/unischema-plan.md's "Production scenarios" section) - the test name matches
// the scenario name there on purpose, so a reader can go back and forth between the two.

const mockNormalizeArtifact = jest.fn()
const mockReadCommittedArtifact = jest.fn()
const mockGetSchemaState = jest.fn()
const mockRecordApplied = jest.fn()

jest.unstable_mockModule('@servable/tools', () => ({
  __esModule: true,
  normalizeArtifact: (...args) => mockNormalizeArtifact(...args),
}))

jest.unstable_mockModule('../../src/launch/start/schemaState/readCommittedArtifact.js', () => ({
  __esModule: true,
  default: (...args) => mockReadCommittedArtifact(...args),
}))

const { default: checkSchemaCompatibility } = await import(
  '../../src/launch/start/schemaState/checkSchemaCompatibility.js'
)

const servableConfig = { configuration: { key: 'test-app' } }
const stateStore = {
  schemaState: {
    get: (...args) => mockGetSchemaState(...args),
    recordApplied: (...args) => mockRecordApplied(...args),
  },
}
const check = () => checkSchemaCompatibility({ schemaBuildResult: {}, servableConfig, stateStore })

describe('checkSchemaCompatibility', () => {
  beforeEach(() => {
    mockNormalizeArtifact.mockReset()
    mockReadCommittedArtifact.mockReset()
    mockGetSchemaState.mockReset()
    mockRecordApplied.mockReset()
  })

  test('nominal: additive rolling deploy (pod B, floor unchanged) passes and records', async () => {
    mockReadCommittedArtifact.mockReturnValue({ hash: 'H2', compatibilityFloor: 0 })
    mockNormalizeArtifact.mockReturnValue({ hash: 'H2' })
    mockGetSchemaState.mockResolvedValue({ compatibilityFloor: 0 })

    await expect(check()).resolves.toBeDefined()

    expect(mockGetSchemaState).toHaveBeenCalledWith({ key: 'test-app' })
    expect(mockRecordApplied).toHaveBeenCalledWith({ key: 'test-app', artifactHash: 'H2', compatibilityFloor: 0 })
  })

  test('nominal: redeploy with no schema change at all is a no-op-equivalent pass', async () => {
    mockReadCommittedArtifact.mockReturnValue({ hash: 'H1', compatibilityFloor: 0 })
    mockNormalizeArtifact.mockReturnValue({ hash: 'H1' })
    mockGetSchemaState.mockResolvedValue({ compatibilityFloor: 0 })

    await expect(check()).resolves.toBeDefined()
    expect(mockRecordApplied).toHaveBeenCalledWith(
      expect.objectContaining({ artifactHash: 'H1', compatibilityFloor: 0 })
    )
  })

  test('edge case: drift (schema.json edited without running `schema build`) refuses to boot', async () => {
    mockReadCommittedArtifact.mockReturnValue({ hash: 'H1', compatibilityFloor: 0 })
    mockNormalizeArtifact.mockReturnValue({ hash: 'H2' }) // sources produce something else now

    await expect(check()).rejects.toThrow(/out of date/)

    expect(mockGetSchemaState).not.toHaveBeenCalled()
    expect(mockRecordApplied).not.toHaveBeenCalled()
  })

  test('edge case: `schema contract` deploy (pod B, floor bump) passes and raises the recorded floor', async () => {
    mockReadCommittedArtifact.mockReturnValue({ hash: 'H3', compatibilityFloor: 1 })
    mockNormalizeArtifact.mockReturnValue({ hash: 'H3' })
    mockGetSchemaState.mockResolvedValue({ compatibilityFloor: 0 }) // nothing has bumped it yet

    await expect(check()).resolves.toBeDefined()
    expect(mockRecordApplied).toHaveBeenCalledWith(
      expect.objectContaining({ compatibilityFloor: 1 })
    )
  })

  test('edge case: old pod (pre-contract build) rebooting after the floor was already raised is refused', async () => {
    mockReadCommittedArtifact.mockReturnValue({ hash: 'H1', compatibilityFloor: 0 })
    mockNormalizeArtifact.mockReturnValue({ hash: 'H1' })
    mockGetSchemaState.mockResolvedValue({ compatibilityFloor: 1 }) // a contract already shipped

    await expect(check()).rejects.toThrow(/lower than the database's recorded floor/)

    expect(mockRecordApplied).not.toHaveBeenCalled()
  })

  test('edge case: rollback to a pre-contract image is refused by the same floor check, not a special case', async () => {
    // Identical shape to the "old pod rebooting" case above - a rollback IS an old pod rebooting,
    // from the check's point of view. Kept as its own test purely so this equivalence is
    // documented and doesn't need re-deriving later.
    mockReadCommittedArtifact.mockReturnValue({ hash: 'H2', compatibilityFloor: 0 })
    mockNormalizeArtifact.mockReturnValue({ hash: 'H2' })
    mockGetSchemaState.mockResolvedValue({ compatibilityFloor: 1 })

    await expect(check()).rejects.toThrow(/lower than the database's recorded floor/)
  })

  test('edge case: very first deploy ever, no schema state record yet, defaults storedFloor to 0', async () => {
    mockReadCommittedArtifact.mockReturnValue({ hash: 'H1', compatibilityFloor: 0 })
    mockNormalizeArtifact.mockReturnValue({ hash: 'H1' })
    mockGetSchemaState.mockResolvedValue(null)

    await expect(check()).resolves.toBeDefined()
    expect(mockRecordApplied).toHaveBeenCalledWith(
      expect.objectContaining({ compatibilityFloor: 0 })
    )
  })

  test('edge case: no servable.schema.json committed at all refuses to boot before touching the DB', async () => {
    mockReadCommittedArtifact.mockReturnValue(null)

    await expect(check()).rejects.toThrow(/No servable\.schema\.json found/)

    expect(mockNormalizeArtifact).not.toHaveBeenCalled()
    expect(mockGetSchemaState).not.toHaveBeenCalled()
  })

  test('edge case: state store unreachable fails closed (blocks boot, does not silently proceed)', async () => {
    mockReadCommittedArtifact.mockReturnValue({ hash: 'H1', compatibilityFloor: 0 })
    mockNormalizeArtifact.mockReturnValue({ hash: 'H1' })
    mockGetSchemaState.mockRejectedValue(new Error('connect ECONNREFUSED'))

    await expect(check()).rejects.toThrow(/ECONNREFUSED/)

    expect(mockRecordApplied).not.toHaveBeenCalled()
  })
})
