import adaptGenericProtocol from "./adaptGenericProtocol.js"
import serverSystem from '../../../launchDockerInstances/handleProtocol/system/index.js'

export default async ({
  schema,
  servableConfig,
  protocol,
  engine
}) => {

  let payload
  const adaptPayloadProps = {
    config: protocol.system.docker,
    protocol,
    servableConfig,
    schema
  }

  if (protocol.id === 'app') {
    const enginePayload = await engine.system.adaptAppPayload(adaptPayloadProps)
    const serverSystemPayload = await serverSystem.adaptAppPayload(adaptPayloadProps)
    payload = {
      ...serverSystemPayload,
      ...enginePayload,
    }
  }
  else {
    payload = await adaptGenericProtocol(adaptPayloadProps)
  }

  const adaptPayload = await protocol.loader.systemDockerPayloadAdapter()
  if (adaptPayload) {
    payload = await adaptPayload({ ...adaptPayloadProps, payload })
  }

  protocol.system = {
    ...(protocol.system ? protocol.system : {}),
    payload
  }
}
