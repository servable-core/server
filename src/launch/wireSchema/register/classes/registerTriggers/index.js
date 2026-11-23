import * as ProtocolTriggers from './protocolTriggers/index.js'
import buildClassTriggerPlan, { areTriggersRegisteredOnlyWhereHandledFor } from './triggerPlan.js'

/**
 * Registers a managed class's save and delete triggers with the engine, from its trigger plan (./triggerPlan.js):
 * only the kinds that run something (plus beforeSave wherever afterSave does), unless
 * SERVABLE_TRIGGERS_ONLY_WHERE_HANDLED / `servableConfig.triggers.areRegisteredOnlyWhereHandled` turns that off.
 * What each trigger runs, and in which order, is the same as before the plan; only the per-call loader work is gone.
 * @returns {Promise<any>} the class's plan, or nothing for a class Servable leaves alone (`_Session`).
 */
export default async ({
  _class,
  protocol,
  protocolInstance,
  allProtocols,
  servableConfig,
  triggerPlans,
}) => {
  try {
    const { className } = _class

    if (className === "_Session") {
      return
    }

    const classTriggers = await protocol.loader.classTriggers({ className })
    const plan = await buildClassTriggerPlan({
      className,
      protocol,
      allProtocols,
      classTriggers,
      areRegisteredOnlyWhereHandled: areTriggersRegisteredOnlyWhereHandledFor({ servableConfig }),
    })
    triggerPlans && triggerPlans.push(plan)
    const { kinds, registeredKinds } = plan

    if (registeredKinds.includes('beforeSave')) {
      Servable.App.Cloud.beforeSave(className, async (request) => {
        try {
          await ProtocolTriggers.beforeSave({ request, protocol, protocolInstance, kindPlan: kinds.beforeSave })
          for (const hookName of kinds.beforeSave.classHookNames) {
            await classTriggers[hookName]({ request, protocol, protocolInstance })
          }
        } catch (e) {
          console.error(`[Class ${className}] ⚠️ beforeSave`, e.message)
        }
      })
    }

    if (registeredKinds.includes('afterSave')) {
      Servable.App.Cloud.afterSave(className, async (request) => {
        try {
          // Nothing awaited: the protocols' and the class's afterSave work runs in the background, as before.
          ProtocolTriggers.afterSave({ request, protocol, protocolInstance, kindPlan: kinds.afterSave })
          for (const hookName of kinds.afterSave.classHookNames) {
            classTriggers[hookName]({ request, protocol, protocolInstance })
          }
        } catch (e) {
          console.error(`[Class ${className}] ⚠️ afterSave`, e.message)
        }
      })
    }

    if (registeredKinds.includes('beforeDelete')) {
      Servable.App.Cloud.beforeDelete(className, async (request) => {
        try {
          await ProtocolTriggers.beforeDelete({ request, protocol, protocolInstance, kindPlan: kinds.beforeDelete })
          for (const hookName of kinds.beforeDelete.classHookNames) {
            await classTriggers[hookName]({ request, protocol, protocolInstance })
          }
        } catch (e) {
          console.error(`[Class ${className}] ⚠️ beforeDelete`, e.message)
        }
      })
    }

    if (registeredKinds.includes('afterDelete')) {
      Servable.App.Cloud.afterDelete(className, async (request) => {
        try {
          await ProtocolTriggers.afterDelete({ request, protocol, protocolInstance, kindPlan: kinds.afterDelete })
          for (const hookName of kinds.afterDelete.classHookNames) {
            await classTriggers[hookName]({ request, protocol, protocolInstance })
          }
        } catch (e) {
          console.error(`[Class ${className}] ⚠️ afterDelete`, e.message)
        }
      })
    }

    // beforeFind / afterFind were never registered (commented out before the plan); they stay out.
    return plan
  }
  catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') {
      console.error(e)
    }
  }
}
