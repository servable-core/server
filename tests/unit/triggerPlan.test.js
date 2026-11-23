import { jest } from '@jest/globals'
import { compareLegacyAndPlannedTriggers } from '../fixtures/triggerEquivalence.js'
import {
  areTriggersRegisteredOnlyWhereHandledFor,
  buildClassTriggerPlan,
  protocolOperationsOf,
  TRIGGER_REGISTRATION_ENVIRONMENT_VARIABLE,
} from '../../src/launch/wireSchema/register/classes/registerTriggers/triggerPlan.js'
import { triggerPlansSummaryOf } from '../../src/launch/wireSchema/index.js'

// The trigger plan (framework audit 2026-11-23, F1 + F2): built once at boot, it must make every trigger run exactly
// what the legacy registration ran, in the same order, with the same arguments, and register a Parse trigger only
// where something runs (plus beforeSave wherever afterSave runs, for request.context.dirtyKeys).

const mulberry32 = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6D2B79F5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const HANDLER_NAMES = ['beforeSave', 'beforesave', 'afterSave', 'aftersave', 'beforeDelete', 'beforedelete', 'afterDelete', 'afterdelete', 'beforeFind']

const fakeProtocol = ({ id, managedClassNames = [], classProtocolsByClass = {}, triggers = null, metadata = null, classTriggersByClass = {} }) => ({
  id,
  schema: { classes: { managed: managedClassNames.map((className) => ({ className })) } },
  loader: {
    classProtocols: async ({ className }) => classProtocolsByClass[className] || [],
    triggers: async () => triggers,
    triggersMetadata: async () => metadata,
    classTriggers: async ({ className }) => classTriggersByClass[className] || null,
  },
})

const noop = async () => {}

const randomProtocolsOf = (random) => {
  const pick = (items) => items[Math.floor(random() * items.length)]
  const protocolCount = 3 + Math.floor(random() * 7)
  const ids = Array.from({ length: protocolCount }, (_, index) => `p${index}`)
  const protocols = ids.map((id, index) => {
    const triggers = random() < 0.2 ? null : Object.fromEntries(
      HANDLER_NAMES.filter(() => random() < 0.3).map((name) => [name, noop]),
    )
    // Dependencies only on protocols listed before (no cycle: the legacy code never ended on one), plus unknown ids.
    const dependencies = ids.slice(0, index).filter(() => random() < 0.35).map((dependencyId) => ({ id: dependencyId }))
    if (random() < 0.1) {
      dependencies.push({ id: 'unknown-dependency' })
    }
    const metadata = random() < 0.3 ? null : { dependencies: random() < 0.15 ? [] : dependencies }
    return { id, triggers, metadata }
  })
  const managers = protocols.filter(() => random() < 0.5)
  if (!managers.length) {
    managers.push(protocols[0])
  }
  let classIndex = 0
  return protocols.map((protocol) => {
    const isManager = managers.includes(protocol)
    const managedClassNames = isManager ? Array.from({ length: 1 + Math.floor(random() * 3) }, () => `Class${classIndex++}`) : []
    const classProtocolsByClass = {}
    const classTriggersByClass = {}
    for (const className of managedClassNames) {
      const attached = ids.filter(() => random() < 0.5).sort(() => random() - 0.5)
      if (random() < 0.2) {
        attached.push(pick(ids))
      }
      if (random() < 0.1) {
        attached.push('not-a-protocol')
      }
      classProtocolsByClass[className] = attached.map((attachedId) => (random() < 0.5 ? attachedId : { id: attachedId, params: { weight: Math.floor(random() * 100) } }))
      if (random() < 0.5) {
        classTriggersByClass[className] = Object.fromEntries(HANDLER_NAMES.filter(() => random() < 0.3).map((name) => [name, noop]))
      }
    }
    return fakeProtocol({ ...protocol, managedClassNames, classProtocolsByClass, classTriggersByClass })
  })
}

describe('the trigger plan', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    delete process.env[TRIGGER_REGISTRATION_ENVIRONMENT_VARIABLE]
  })
  afterEach(() => jest.restoreAllMocks())

  test.each([1, 2, 3, 4, 5])('runs what the legacy triggers ran, in the same order, on random protocol graphs (seed %i, 60 graphs)', async (seed) => {
    const random = mulberry32(seed * 7919)
    let comparedCount = 0
    for (let graph = 0; graph < 60; graph++) {
      const allProtocols = randomProtocolsOf(random)
      const { rows, differences } = await compareLegacyAndPlannedTriggers({ allProtocols })
      expect(differences).toEqual([])
      for (const row of rows) {
        const isAfterSaveRegistered = rows.find((other) => other.className === row.className && other.kind === 'afterSave').isPlannedRegistered
        const isNeeded = row.legacyHandlerNames.length > 0 || (row.kind === 'beforeSave' && isAfterSaveRegistered)
        // Registered exactly where it runs something (or keeps dirtyKeys for afterSave).
        expect({ ...row, isNeeded }).toEqual({ ...row, isNeeded: row.isPlannedRegistered })
      }
      comparedCount += rows.length
    }
    expect(comparedCount).toBeGreaterThan(300)
  }, 120000)

  test('orders a protocol after the dependencies attached to the same class, each once', async () => {
    const triggerFiles = {
      a: { triggers: { beforeSave: noop }, metadata: { dependencies: [{ id: 'c' }, { id: 'b' }] } },
      b: { triggers: { beforesave: noop }, metadata: null },
      c: { triggers: { beforeSave: noop }, metadata: { dependencies: [{ id: 'b' }] } },
      d: { triggers: { afterSave: noop }, metadata: { dependencies: [{ id: 'b' }] } },
    }
    const operations = await protocolOperationsOf({
      classProtocols: ['a', { id: 'b', params: { x: 1 } }, 'd', 'c', 'missing'],
      operationName: 'beforeSave',
      resolveTriggerFiles: async (id) => triggerFiles[id] || null,
    })
    expect(operations.map(({ protocolId }) => protocolId)).toEqual(['b', 'c', 'a'])
    expect(operations[0].protocolPayload).toEqual({ id: 'b', params: { x: 1 } })
  })

  test('breaks a dependency cycle (the legacy recursion never ended) and says so', async () => {
    const warnings = []
    const triggerFiles = {
      a: { triggers: { beforeSave: noop }, metadata: { dependencies: [{ id: 'b' }] } },
      b: { triggers: { beforeSave: noop }, metadata: { dependencies: [{ id: 'a' }] } },
    }
    const operations = await protocolOperationsOf({
      classProtocols: ['a', 'b'],
      operationName: 'beforeSave',
      resolveTriggerFiles: async (id) => triggerFiles[id],
      warn: (warning) => warnings.push(warning),
    })
    expect(operations.map(({ protocolId }) => protocolId)).toEqual(['b', 'a'])
    expect(warnings).toEqual([expect.stringContaining('dependency cycle a → b → a')])
  })

  test('registers beforeSave for a class whose only handler is an afterSave, and nothing for a class without handlers', async () => {
    const searchable = fakeProtocol({ id: 'searchable', triggers: { aftersave: noop } })
    const app = fakeProtocol({
      id: 'app',
      managedClassNames: ['Publication', 'Reaction'],
      classProtocolsByClass: { Publication: ['searchable'], Reaction: ['missing'] },
    })
    const allProtocols = [app, searchable]
    const publication = await buildClassTriggerPlan({ className: 'Publication', protocol: app, allProtocols, classTriggers: null })
    const reaction = await buildClassTriggerPlan({ className: 'Reaction', protocol: app, allProtocols, classTriggers: null })
    expect(publication.registeredKinds).toEqual(['beforeSave', 'afterSave'])
    expect(reaction.registeredKinds).toEqual([])
    expect(triggerPlansSummaryOf([publication, reaction])).toBe('Launch > Wire schema > Triggers > 2 of 8 registered, 1 of 2 classes without any')
  })

  test('resolves each protocol\'s trigger files once per boot, whatever the number of classes and saves', async () => {
    const searchable = fakeProtocol({ id: 'searchable', triggers: { beforeSave: noop }, metadata: null })
    const triggers = jest.spyOn(searchable.loader, 'triggers')
    const metadata = jest.spyOn(searchable.loader, 'triggersMetadata')
    const app = fakeProtocol({
      id: 'app',
      managedClassNames: ['A', 'B', 'C'],
      classProtocolsByClass: { A: ['searchable'], B: ['searchable'], C: ['searchable'] },
    })
    const allProtocols = [app, searchable]
    for (const className of ['A', 'B', 'C']) {
      await buildClassTriggerPlan({ className, protocol: app, allProtocols, classTriggers: null })
    }
    expect(triggers).toHaveBeenCalledTimes(1)
    expect(metadata).toHaveBeenCalledTimes(1)
  })

  test('the switch turns the limited registration off (all four kinds again), the environment winning over the app', async () => {
    expect(areTriggersRegisteredOnlyWhereHandledFor({ env: {} })).toBe(true)
    expect(areTriggersRegisteredOnlyWhereHandledFor({ servableConfig: { triggers: { areRegisteredOnlyWhereHandled: false } }, env: {} })).toBe(false)
    expect(areTriggersRegisteredOnlyWhereHandledFor({ servableConfig: { triggers: { areRegisteredOnlyWhereHandled: false } }, env: { [TRIGGER_REGISTRATION_ENVIRONMENT_VARIABLE]: 'on' } })).toBe(true)
    expect(areTriggersRegisteredOnlyWhereHandledFor({ env: { [TRIGGER_REGISTRATION_ENVIRONMENT_VARIABLE]: 'OFF' } })).toBe(false)
    expect(areTriggersRegisteredOnlyWhereHandledFor({ env: { [TRIGGER_REGISTRATION_ENVIRONMENT_VARIABLE]: 'maybe' } })).toBe(true)

    const app = fakeProtocol({ id: 'app', managedClassNames: ['Reaction'] })
    const plan = await buildClassTriggerPlan({ className: 'Reaction', protocol: app, allProtocols: [app], classTriggers: null, areRegisteredOnlyWhereHandled: false })
    expect(plan.registeredKinds).toEqual(['beforeSave', 'afterSave', 'beforeDelete', 'afterDelete'])

    // And the switched-off registration still runs the same handlers as the legacy one.
    process.env[TRIGGER_REGISTRATION_ENVIRONMENT_VARIABLE] = 'off'
    const { differences, rows } = await compareLegacyAndPlannedTriggers({ allProtocols: randomProtocolsOf(mulberry32(42)) })
    expect(differences).toEqual([])
    expect(rows.every((row) => row.isPlannedRegistered)).toBe(true)
  })

  test('a protocol named by its id gets fresh params on every call, as before', async () => {
    const seen = []
    const tagger = fakeProtocol({
      id: 'tagger',
      triggers: { beforeSave: async ({ protocolParams }) => { seen.push(protocolParams); protocolParams.params.touched = true } },
    })
    const app = fakeProtocol({ id: 'app', managedClassNames: ['A'], classProtocolsByClass: { A: ['tagger'] } })
    const handlers = {}
    globalThis.Servable = { App: { Cloud: { beforeSave: (className, handler) => { handlers[className] = handler }, afterSave: () => {}, beforeDelete: () => {}, afterDelete: () => {} } } }
    const { default: registerTriggers } = await import('../../src/launch/wireSchema/register/classes/registerTriggers/index.js')
    await registerTriggers({ _class: { className: 'A' }, protocol: app, allProtocols: [app, tagger] })
    const request = () => ({ object: { className: 'A', dirtyKeys: () => [] }, context: {} })
    await handlers.A(request())
    await handlers.A(request())
    expect(seen).toEqual([{ id: 'tagger', slug: 'tagger', name: 'tagger', params: { touched: true } }, { id: 'tagger', slug: 'tagger', name: 'tagger', params: { touched: true } }])
    expect(seen[0]).not.toBe(seen[1])
    delete globalThis.Servable
  })
})
