import { createHash } from 'node:crypto'
import { serverMetrics } from './serverMetrics.js'

// Production proof 3.6 (.docs/technical/production-proof-instrumentation-2026-11-23.md, owner's Q1465 a): the trigger plan
// (launch/wireSchema/register/classes/registerTriggers) registers a Parse trigger only where something runs, so a trigger firing
// without a plan entry cannot happen; the silent failure is the reverse, a handler the plan left out, or an afterSave that no
// longer receives the `dirtyKeys` its beforeSave puts in `request.context` (searchable's re-index then quietly does nothing).
//   servable_trigger_runs_total{class_name, kind}            each registered trigger that ran (only registered pairs appear)
//   servable_trigger_dirty_keys_missing_total{class_name}    an afterSave whose context carries no dirtyKeys list: must stay 0
// and one boot line with the plan's identity, so two boots of one image compare at a glance:
//   [Servable] trigger plan { proof: 'trigger-plan', registered, kinds, classesWithoutAny, planHash, isOnlyWhereHandled }

/**
 * Counts one run of a registered trigger. Never throws.
 * @param {{ className: string, kind: string }} props
 */
export const recordTheTriggerRun = ({ className, kind }) => {
  try {
    serverMetrics().counter('servable_trigger_runs_total', {
      description: 'Count of registered Parse triggers that ran, by class and kind.',
    }).add(1, { class_name: className, kind })
  } catch (error) {
    // A count never fails a save.
  }
}

/**
 * In an afterSave: counts it when the request's context carries no dirtyKeys list. Answers whether they were missing. Never throws.
 * @param {{ className: string, request: any }} props
 */
export const recordWhetherTheDirtyKeysAreMissing = ({ className, request }) => {
  try {
    const isMissing = !Array.isArray(request?.context?.dirtyKeys)
    if (isMissing) {
      serverMetrics().counter('servable_trigger_dirty_keys_missing_total', {
        description: 'Count of afterSave triggers whose request context carried no dirtyKeys list. Must stay at 0.',
      }).add(1, { class_name: className })
    }
    return isMissing
  } catch (error) {
    return false
  }
}

/**
 * The plan's identity: how many kinds it registered, out of how many, the classes without any, and a hash of the sorted
 * `className:kinds` list. Pure.
 * @param {{ triggerPlans: any[], isOnlyWhereHandled: boolean }} props
 */
export const triggerPlanProofOf = ({ triggerPlans, isOnlyWhereHandled }) => {
  const plans = Array.isArray(triggerPlans) ? triggerPlans : []
  const planText = plans
    .map((plan) => `${plan.className}:${[...(plan.registeredKinds || [])].sort().join(',')}`)
    .sort()
    .join('\n')
  return {
    proof: 'trigger-plan',
    registered: plans.reduce((count, plan) => count + (plan.registeredKinds || []).length, 0),
    kinds: plans.length * 4,
    classesWithoutAny: plans.filter((plan) => !(plan.registeredKinds || []).length).length,
    planHash: createHash('sha256').update(planText).digest('hex').slice(0, 16),
    isOnlyWhereHandled: Boolean(isOnlyWhereHandled),
  }
}

/**
 * Logs the boot line. Never throws.
 * @param {{ triggerPlans: any[], isOnlyWhereHandled: boolean, logger?: { info: (...args: any[]) => void } }} props
 */
export const reportTheTriggerPlan = ({ triggerPlans, isOnlyWhereHandled, logger = console }) => {
  try {
    const fields = triggerPlanProofOf({ triggerPlans, isOnlyWhereHandled })
    logger.info(fields, '[Servable] trigger plan')
    return fields
  } catch (error) {
    return null
  }
}
