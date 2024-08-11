import adaptAppProtocol from "./adaptAppProtocol.js"
import adaptGenericProtocol from "./adaptGenericProtocol.js"

export default async ({
  schema,
  servableConfig,
  item: protocol
}) => {

  let payload
  const adaptPayloadProps = {
    config: protocol.system.docker,
    item: protocol,
    servableConfig,
    schema
  }

  const adaptPayload = await protocol.loader.systemDockerPayloadAdapter()
  if (adaptPayload) {
    payload = await adaptPayload(adaptPayloadProps)
  }
  else if (protocol.id === 'app') {
    payload = await adaptAppProtocol(adaptPayloadProps)
  }
  else {
    payload = await adaptGenericProtocol(adaptPayloadProps)
  }

  protocol.system = {
    ...(protocol.system ? protocol.system : {}),
    payload
  }
}
