// Runs the legacy trigger registration (./legacyTriggers, frozen) and the planned one (src) over the same protocols,
// and compares, for every managed class and every kind of trigger, what each would run: the handlers called (protocol
// operations and the class's own hooks), in order, with the arguments they get, and what lands in request.context.
//
// The protocols' trigger files are wrapped once, at the loader, so both registrations see the same functions; each
// wrapper only records its call (nothing of the app runs).
import registerLegacyTriggers from './legacyTriggers/index.js'
import registerPlannedTriggers from '../../src/launch/wireSchema/register/classes/registerTriggers/index.js'

export const KINDS = ['beforeSave', 'afterSave', 'beforeDelete', 'afterDelete']

// afterSave's work runs in the background (the legacy one after the loader's file checks): wait until no new call
// has come for a few rounds. Real protocol files need rounds of a few milliseconds (file checks); fakes, a turn.
const flushBackgroundWork = async (calls, quietRoundMilliseconds) => {
  let quietRounds = 0
  let lastCount = -1
  while (quietRounds < 3) {
    await new Promise((resolve) => (quietRoundMilliseconds ? setTimeout(resolve, quietRoundMilliseconds) : setImmediate(resolve)))
    quietRounds = calls.length === lastCount ? quietRounds + 1 : 0
    lastCount = calls.length
  }
}

const recorderOf = () => {
  const state = { calls: null, currentRequest: null }
  const spyOf = (handlerName) => async (args = {}) => {
    state.calls?.push({
      handlerName,
      protocolId: args.protocol?.id,
      protocolParams: args.protocolParams === undefined ? undefined : JSON.stringify(args.protocolParams),
      isTheSaveRequest: args.request === state.currentRequest,
    })
    await Promise.resolve()
  }
  const spiedCopyOf = (handlers, prefix) => {
    if (!handlers) {
      return handlers
    }
    const copy = {}
    for (const key of Object.keys(handlers)) {
      copy[key] = typeof handlers[key] === 'function' ? spyOf(`${prefix}:${key}`) : handlers[key]
    }
    return copy
  }
  return { state, spiedCopyOf }
}

/**
 * Wraps every protocol's `triggers()` and `classTriggers()` so the functions they answer only record their calls.
 * @param {any[]} allProtocols
 */
export const instrumentTheProtocols = (allProtocols) => {
  const recorder = recorderOf()
  for (const protocol of allProtocols) {
    const { loader } = protocol
    const triggersOf = loader.triggers.bind(loader)
    const classTriggersOf = loader.classTriggers.bind(loader)
    const spiedTriggers = { value: undefined }
    loader.triggers = async () => {
      if (spiedTriggers.value === undefined) {
        spiedTriggers.value = recorder.spiedCopyOf(await triggersOf(), `protocol:${protocol.id}`)
      }
      return spiedTriggers.value
    }
    const spiedClassTriggers = new Map()
    loader.classTriggers = async ({ className }) => {
      if (!spiedClassTriggers.has(className)) {
        spiedClassTriggers.set(className, recorder.spiedCopyOf(await classTriggersOf({ className }), `class:${className}`))
      }
      return spiedClassTriggers.get(className)
    }
  }
  return recorder
}

const registrationsOf = async ({ register, allProtocols, servableConfig }) => {
  const handlers = {}
  const engineCloud = {}
  for (const kind of KINDS) {
    engineCloud[kind] = (className, handler) => {
      handlers[className] = handlers[className] || {}
      handlers[className][kind] = handler
    }
  }
  const previousServable = globalThis.Servable
  globalThis.Servable = { ...(previousServable || {}), App: { ...(previousServable?.App || {}), Cloud: engineCloud } }
  try {
    for (const protocol of allProtocols) {
      for (const _class of protocol.schema.classes.managed) {
        await register({ _class, protocol, allProtocols, servableConfig })
      }
    }
  } finally {
    globalThis.Servable = previousServable
  }
  return handlers
}

const runOnce = async ({ handler, recorder, className, dirtyKeys, isRunInTheBackground, quietRoundMilliseconds }) => {
  const request = {
    object: { className, id: 'object-id', dirtyKeys: () => dirtyKeys },
    context: {},
  }
  recorder.state.calls = []
  recorder.state.currentRequest = request
  if (handler) {
    await handler(request)
  }
  if (isRunInTheBackground) {
    await flushBackgroundWork(recorder.state.calls, quietRoundMilliseconds)
  }
  const calls = recorder.state.calls
  recorder.state.calls = null
  return { calls, context: request.context }
}

/**
 * @param {object} props
 * @param {any[]} props.allProtocols - with loaders (buildSchema's protocols, or fakes).
 * @param {any} [props.servableConfig]
 * @param {number} [props.quietRoundMilliseconds] - how long a quiet round lasts while waiting for afterSave's background work (0: one turn of the event loop).
 * @returns {Promise<{ rows: any[], differences: any[] }>} one row per managed class and kind.
 */
export const compareLegacyAndPlannedTriggers = async ({ allProtocols, servableConfig = {}, quietRoundMilliseconds = 0 }) => {
  const recorder = instrumentTheProtocols(allProtocols)
  const legacyHandlers = await registrationsOf({ register: registerLegacyTriggers, allProtocols, servableConfig })
  const plannedHandlers = await registrationsOf({ register: registerPlannedTriggers, allProtocols, servableConfig })

  const rows = []
  const differences = []
  const classNames = allProtocols.flatMap((protocol) => protocol.schema.classes.managed.map(({ className }) => className))
  for (const className of classNames) {
    const dirtyKeys = [`${className}-dirty-key`]
    const isAfterSavePlanned = Boolean(plannedHandlers[className]?.afterSave)
    for (const kind of KINDS) {
      const isRunInTheBackground = kind === 'afterSave'
      const legacy = await runOnce({ handler: legacyHandlers[className]?.[kind], recorder, className, dirtyKeys, isRunInTheBackground, quietRoundMilliseconds })
      const planned = await runOnce({ handler: plannedHandlers[className]?.[kind], recorder, className, dirtyKeys, isRunInTheBackground, quietRoundMilliseconds })
      const isPlannedRegistered = Boolean(plannedHandlers[className]?.[kind])
      const row = {
        className,
        kind,
        isLegacyRegistered: Boolean(legacyHandlers[className]?.[kind]),
        isPlannedRegistered,
        legacyHandlerNames: legacy.calls.map(({ handlerName }) => handlerName),
        plannedHandlerNames: planned.calls.map(({ handlerName }) => handlerName),
      }
      rows.push(row)
      const isSameCalls = JSON.stringify(legacy.calls) === JSON.stringify(planned.calls)
      // The context matters where something reads it: the afterSave hooks read what beforeSave put there.
      const isContextNeeded = kind === 'beforeSave' ? isAfterSavePlanned || legacy.calls.length > 0 : isPlannedRegistered
      const isSameContext = !isContextNeeded || JSON.stringify(legacy.context) === JSON.stringify(planned.context)
      if (!isSameCalls || !isSameContext) {
        differences.push({ ...row, legacyCalls: legacy.calls, plannedCalls: planned.calls, legacyContext: legacy.context, plannedContext: planned.context })
      }
    }
  }
  return { rows, differences }
}
