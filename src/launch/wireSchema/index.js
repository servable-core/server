import registerProtocol from "./register/index.js"
import { areTriggersRegisteredOnlyWhereHandledFor } from "./register/classes/registerTriggers/triggerPlan.js"
import { reportTheTriggerPlan } from "../../lib/proof/triggerSignals.js"

/**
 * One line on what the trigger plans registered (register/classes/registerTriggers/triggerPlan.js).
 * @param {any[]} triggerPlans
 */
export const triggerPlansSummaryOf = (triggerPlans) => {
  const kindsCount = triggerPlans.length * 4
  const registeredCount = triggerPlans.reduce((count, plan) => count + plan.registeredKinds.length, 0)
  const classesWithoutTriggerCount = triggerPlans.filter((plan) => !plan.registeredKinds.length).length
  return `Launch > Wire schema > Triggers > ${registeredCount} of ${kindsCount} registered, ${classesWithoutTriggerCount} of ${triggerPlans.length} classes without any`
}

export default async ({ schema, servableConfig }) => {
  const {
    protocols
  } = schema
  console.log("[Servable]", `Launch > Wire schema > Start`)
  const triggerPlans = []
  await Promise.all(protocols.map(async protocol => {
    await registerProtocol({
      protocol,
      servableConfig,
      allProtocols: protocols,
      triggerPlans,
    })
  }))
  console.log("[Servable]", triggerPlansSummaryOf(triggerPlans))
  // Production proof 3.6: the plan's identity, its fields in a leading object.
  reportTheTriggerPlan({ triggerPlans, isOnlyWhereHandled: areTriggersRegisteredOnlyWhereHandledFor({ servableConfig }) })
  console.log("[Servable]", `Launch > Wire schema > Success`)
}
