import performClassProtocol from './performClassProtocol.js'
import adaptProtocolPayload from '../../../../../../utils/adaptProtocolPayload.js'

export default async ({
  allProtocols,
  protocol,
  request,
  operationName,
  protocolInstance,
}) => {

  const { object } = request
  // if (request.object.disposableOrphans) {
  //     const dd = object.disposableOrphans()
  //     console.log("[Servable]", dd)
  // }

  if (!object) {
    return
  }

  const { className } = object
  let classProtocols = await protocol.loader.classProtocols({ className })
  if (!classProtocols || !classProtocols.length) {
    return
  }

  classProtocols = classProtocols.map(adaptProtocolPayload)

  // const items = object.constructor.protocols
  //     ? object.constructor.protocols.map(adaptProtocolPayload)
  //     : []

  const cache = {}
  for (var i in classProtocols) {
    const protocolParams = classProtocols[i]
    await performClassProtocol({
      allProtocols,
      protocol,
      protocolInstance,
      request,
      operationName,
      classProtocols,
      protocolParams,
      cache
    })
  }
}
