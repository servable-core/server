import { jest } from '@jest/globals'
import { recordTheTriggerRun, recordWhetherTheDirtyKeysAreMissing, reportTheTriggerPlan, triggerPlanProofOf } from '../../src/lib/proof/triggerSignals.js'
import registerTriggers from '../../src/launch/wireSchema/register/classes/registerTriggers/index.js'

// Production proof 3.6: the plan's triggers are counted when they run, an afterSave without dirtyKeys is the alarm, and the boot
// line carries the plan's identity.

const recordingMetrics = () => {
  const recorded = []
  return { recorded, counter: (name) => ({ add: (value, attributes) => recorded.push({ name, value, attributes }) }) }
}
afterEach(() => { delete globalThis.Servable })

describe('trigger runs', () => {
  test('counted by class and kind (the healthy path); an afterSave with its dirtyKeys is no alarm', () => {
    const metrics = recordingMetrics()
    globalThis.Servable = { App: { Metrics: metrics } }
    recordTheTriggerRun({ className: 'Article', kind: 'afterSave' })
    expect(recordWhetherTheDirtyKeysAreMissing({ className: 'Article', request: { context: { dirtyKeys: ['title'] } } })).toBe(false)
    expect(metrics.recorded).toEqual([{ name: 'servable_trigger_runs_total', value: 1, attributes: { class_name: 'Article', kind: 'afterSave' } }])
  })

  test('an afterSave whose context lost its dirtyKeys is counted (the alarm path)', () => {
    const metrics = recordingMetrics()
    globalThis.Servable = { App: { Metrics: metrics } }
    expect(recordWhetherTheDirtyKeysAreMissing({ className: 'Article', request: { context: {} } })).toBe(true)
    expect(metrics.recorded).toEqual([{ name: 'servable_trigger_dirty_keys_missing_total', value: 1, attributes: { class_name: 'Article' } }])
  })
})

describe('the registered triggers', () => {
  test('count each run, and afterSave says when its dirtyKeys are missing', async () => {
    const metrics = recordingMetrics()
    const registered = {}
    const cloud = Object.fromEntries(['beforeSave', 'afterSave', 'beforeDelete', 'afterDelete'].map((kind) => [kind, (className, handler) => { registered[kind] = handler }]))
    globalThis.Servable = { App: { Metrics: metrics, Cloud: cloud } }
    const protocol = { id: 'p', loader: { classTriggers: async () => ({ afterSave: jest.fn() }), classProtocols: async () => [] } }
    await registerTriggers({ _class: { className: 'Article' }, protocol, protocolInstance: {}, allProtocols: [protocol], servableConfig: {}, triggerPlans: [] })
    expect(Object.keys(registered).sort()).toEqual(['afterSave', 'beforeSave'])
    await registered.beforeSave({ context: {} })
    await registered.afterSave({ context: {} })
    expect(metrics.recorded.map(({ name, attributes }) => [name, attributes])).toEqual([
      ['servable_trigger_runs_total', { class_name: 'Article', kind: 'beforeSave' }],
      ['servable_trigger_runs_total', { class_name: 'Article', kind: 'afterSave' }],
      ['servable_trigger_dirty_keys_missing_total', { class_name: 'Article' }],
    ])
  })
})

describe('the boot line', () => {
  const plans = [{ className: 'Article', registeredKinds: ['afterSave', 'beforeSave'] }, { className: 'Comment', registeredKinds: [] }]

  test('carries the counts and a hash that does not depend on the order the plans were built in', () => {
    const fields = triggerPlanProofOf({ triggerPlans: plans, isOnlyWhereHandled: true })
    expect(fields).toMatchObject({ proof: 'trigger-plan', registered: 2, kinds: 8, classesWithoutAny: 1, isOnlyWhereHandled: true })
    expect(fields.planHash).toMatch(/^[0-9a-f]{16}$/)
    expect(triggerPlanProofOf({ triggerPlans: [...plans].reverse(), isOnlyWhereHandled: true }).planHash).toBe(fields.planHash)
    expect(triggerPlanProofOf({ triggerPlans: [plans[0]], isOnlyWhereHandled: true }).planHash).not.toBe(fields.planHash)
  })

  test('is logged with its fields in a leading object', () => {
    const logger = { info: jest.fn() }
    const fields = reportTheTriggerPlan({ triggerPlans: plans, isOnlyWhereHandled: false, logger })
    expect(logger.info).toHaveBeenCalledWith(fields, '[Servable] trigger plan')
  })
})
