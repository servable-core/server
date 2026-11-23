import adaptProtocolPayload from '../../../../../../utils/adaptProtocolPayload.js'

/**
 * Runs, one after the other, the protocol operations the class's trigger plan holds for this kind of trigger
 * (../../triggerPlan.js): already in the order the legacy `performClassProtocol` ran them, dependencies first, each
 * protocol once. An operation that throws is logged and the next one still runs, as before.
 * @param {object} props
 * @param {any} props.request
 * @param {string} props.operationName
 * @param {Array<{ protocolId: string, protocolPayload: any, operation: Function }>} props.protocolOperations
 * @param {any} props.protocol - the protocol that manages the class.
 * @param {any} [props.protocolInstance]
 */
export default async ({
  protocol,
  request,
  operationName,
  protocolInstance,
  protocolOperations,
}) => {
  const { object } = request
  if (!object || !protocolOperations || !protocolOperations.length) {
    return
  }

  for (const { protocolId, protocolPayload, operation } of protocolOperations) {
    // Adapted on every call, as before: a protocol named by its id gets a fresh `{ id, params: {} }` each time, so an
    // operation that writes into its params never leaks into the next save.
    const protocolParams = adaptProtocolPayload(protocolPayload)
    try {
      await operation({ request, protocol, protocolInstance, protocolParams })
    } catch (e) {
      console.error(`Protocol > ${protocolId} > ${operationName}`, e.message)
    }
  }
}
