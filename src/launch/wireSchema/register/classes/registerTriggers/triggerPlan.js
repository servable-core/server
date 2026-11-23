// @ts-nocheck - same internal wireSchema glue as ./index.js (see its header in ../index.js).
import _ from 'underscore'

// The trigger plan of a class, built once at boot (framework audit 2026-11-23, F1 and F2).
//
// Before it, Servable registered beforeSave, afterSave, beforeDelete and afterDelete on every class it manages, and each
// call asked the protocol loader again for the class's protocols and their trigger files: about 200 file checks and 42
// import() per Publication save, and, because a trigger existed, Parse read the whole original object before every
// update even when no handler did anything. The plan resolves, once, for each class and each kind of trigger, what the
// legacy call would have run, in the same order:
//
//   - the protocols attached to the class (the managing protocol's `classProtocols`) whose trigger files export that
//     kind, ordered the way the legacy `performClassProtocol` ordered them (a protocol's `dependencies`, from its
//     `target/triggers/metadata.json`, first, each protocol once);
//   - the class's own hooks (`classTriggers`: `beforeSave` then `beforesave`, and so on).
//
// A Parse trigger is then registered only for the kinds that run something. One kind more is kept: beforeSave whenever
// afterSave runs something, because Servable's beforeSave puts `dirtyKeys` in `request.context`, which afterSave hooks
// read (publication, _user, category, coverage, bookclubsuite, searchable...).
//
// Files do not change while the process runs, and an imported module is never imported again by Node anyway, so
// resolving them once loses nothing; there is no hot reload in Servable (a change restarts the process).

export const TRIGGER_KINDS = ['beforeSave', 'afterSave', 'beforeDelete', 'afterDelete']

// The switch that turns the limited registration off: every class then gets the four triggers again, as before the
// plan (the handlers still come from the plan). For a production rollback without a release.
export const TRIGGER_REGISTRATION_ENVIRONMENT_VARIABLE = 'SERVABLE_TRIGGERS_ONLY_WHERE_HANDLED'

/**
 * Reads a switch written in an environment variable: `1`/`true`/`on` and `0`/`false`/`off` (any case). Anything else
 * says nothing.
 * @param {unknown} rawValue
 * @returns {boolean | undefined}
 */
export const booleanFromEnvironmentValue = (rawValue) => {
  if (rawValue === undefined || rawValue === null) {
    return undefined
  }
  const value = String(rawValue).trim().toLowerCase()
  if (['1', 'true', 'on'].includes(value)) {
    return true
  }
  if (['0', 'false', 'off'].includes(value)) {
    return false
  }
  return undefined
}

/**
 * Whether triggers are registered only for the kinds a class handles (the default), or on every class as before.
 * The environment variable wins when it says on or off, then `servableConfig.triggers.areRegisteredOnlyWhereHandled`.
 * @param {object} props
 * @param {any} [props.servableConfig]
 * @param {Record<string, string | undefined>} [props.env]
 * @returns {boolean}
 */
export const areTriggersRegisteredOnlyWhereHandledFor = ({ servableConfig, env = process.env } = {}) => {
  const fromEnvironment = booleanFromEnvironmentValue(env?.[TRIGGER_REGISTRATION_ENVIRONMENT_VARIABLE])
  const fromTheApp = servableConfig?.triggers?.areRegisteredOnlyWhereHandled
  return fromEnvironment ?? (typeof fromTheApp === 'boolean' ? fromTheApp : true)
}

const protocolIdOf = (protocolPayload) => (_.isObject(protocolPayload) ? protocolPayload.id : protocolPayload)

// One resolution of each protocol's trigger files per boot, shared by every class it is attached to.
const triggerFilesResolversByProtocolList = new WeakMap()

/**
 * @param {any[]} allProtocols - `buildSchema().protocols`.
 * @returns {(protocolId: string) => Promise<{ triggers: any, metadata: any } | null>}
 */
export const triggerFilesResolverFor = (allProtocols) => {
  if (triggerFilesResolversByProtocolList.has(allProtocols)) {
    return triggerFilesResolversByProtocolList.get(allProtocols)
  }
  const resolutionsByProtocolId = new Map()
  const resolveTriggerFiles = (protocolId) => {
    if (!resolutionsByProtocolId.has(protocolId)) {
      resolutionsByProtocolId.set(protocolId, (async () => {
        const protocolModule = _.findWhere(allProtocols, { id: protocolId })
        if (!protocolModule) {
          return null
        }
        const triggers = await protocolModule.loader.triggers()
        if (!triggers) {
          return null
        }
        const metadata = await protocolModule.loader.triggersMetadata()
        return { triggers, metadata }
      })())
    }
    return resolutionsByProtocolId.get(protocolId)
  }
  triggerFilesResolversByProtocolList.set(allProtocols, resolveTriggerFiles)
  return resolveTriggerFiles
}

/**
 * The protocol operations one kind of trigger runs on a class, in the order the legacy `performClassProtocol` ran
 * them: for each attached protocol in turn, its dependencies first (only those attached to the class too), then the
 * protocol itself, each protocol once. A protocol without the operation runs nothing, and does not pull its
 * dependencies in either.
 * @param {object} props
 * @param {any[]} props.classProtocols - the attached protocols, as `classProtocols` answers them (ids or `{ id, params }`).
 * @param {string} props.operationName - one of TRIGGER_KINDS.
 * @param {(protocolId: string) => Promise<{ triggers: any, metadata: any } | null>} props.resolveTriggerFiles
 * @param {(warning: string) => void} [props.warn]
 * @returns {Promise<Array<{ protocolId: string, protocolPayload: any, operation: Function }>>}
 */
export const protocolOperationsOf = async ({ classProtocols, operationName, resolveTriggerFiles, warn = console.warn }) => {
  const adaptedClassProtocols = (classProtocols || []).map((protocolPayload) => ({
    protocolPayload,
    protocolId: protocolIdOf(protocolPayload),
  }))
  const plannedProtocolIds = new Set()
  const operations = []

  const plan = async ({ protocolPayload, protocolId }, dependencyChain) => {
    if (plannedProtocolIds.has(protocolId)) {
      return
    }
    const triggerFiles = await resolveTriggerFiles(protocolId)
    if (!triggerFiles) {
      return
    }
    const { triggers, metadata } = triggerFiles
    const operation = triggers[operationName] || triggers[operationName.toLowerCase()]
    if (!operation) {
      return
    }
    for (const dependency of metadata?.dependencies || []) {
      const dependencyId = dependency?.id
      if (plannedProtocolIds.has(dependencyId)) {
        continue
      }
      const attachedDependency = adaptedClassProtocols.find((attached) => attached.protocolId === dependencyId)
      if (!attachedDependency) {
        continue
      }
      if (dependencyChain.includes(dependencyId)) {
        // The legacy recursion never ended on a cycle (a stack overflow on every save); the plan breaks it here.
        warn(`[Servable] Triggers > ${operationName} > dependency cycle ${[...dependencyChain, protocolId, dependencyId].join(' → ')}, ${dependencyId} runs once, where it first appears`)
        continue
      }
      await plan(attachedDependency, [...dependencyChain, protocolId])
    }
    plannedProtocolIds.add(protocolId)
    operations.push({ protocolId, protocolPayload, operation })
  }

  for (const attached of adaptedClassProtocols) {
    await plan(attached, [])
  }
  return operations
}

/**
 * The names of a class's own hooks one kind of trigger calls, in the legacy order (`beforeSave`, then `beforesave`).
 * @param {any} classTriggers - the managing protocol's `classTriggers({ className })`.
 * @param {string} operationName
 * @returns {string[]}
 */
export const classHookNamesOf = (classTriggers, operationName) => {
  if (!classTriggers) {
    return []
  }
  return [operationName, operationName.toLowerCase()].filter((name) => classTriggers[name])
}

/**
 * The trigger plan of one class: what each kind of trigger runs, and which kinds are registered with the engine.
 * @param {object} props
 * @param {string} props.className
 * @param {any} props.protocol - the protocol that manages the class.
 * @param {any[]} props.allProtocols
 * @param {any} props.classTriggers - the class's own hooks, already loaded.
 * @param {boolean} [props.areRegisteredOnlyWhereHandled]
 * @param {(warning: string) => void} [props.warn]
 */
export const buildClassTriggerPlan = async ({
  className,
  protocol,
  allProtocols,
  classTriggers,
  areRegisteredOnlyWhereHandled = true,
  warn,
}) => {
  const resolveTriggerFiles = triggerFilesResolverFor(allProtocols)
  const classProtocols = (await protocol.loader.classProtocols({ className })) || []

  const kinds = {}
  for (const operationName of TRIGGER_KINDS) {
    const protocolOperations = await protocolOperationsOf({ classProtocols, operationName, resolveTriggerFiles, warn })
    const classHookNames = classHookNamesOf(classTriggers, operationName)
    kinds[operationName] = {
      protocolOperations,
      classHookNames,
      doesRunAnything: protocolOperations.length > 0 || classHookNames.length > 0,
    }
  }

  const isKindRegistered = {
    // beforeSave fills request.context.dirtyKeys for the afterSave hooks.
    beforeSave: kinds.beforeSave.doesRunAnything || kinds.afterSave.doesRunAnything,
    afterSave: kinds.afterSave.doesRunAnything,
    beforeDelete: kinds.beforeDelete.doesRunAnything,
    afterDelete: kinds.afterDelete.doesRunAnything,
  }
  const registeredKinds = TRIGGER_KINDS.filter((kind) => !areRegisteredOnlyWhereHandled || isKindRegistered[kind])

  return { className, protocolId: protocol.id, kinds, registeredKinds }
}

export default buildClassTriggerPlan
