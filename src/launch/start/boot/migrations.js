import getMigrationsPayload from "../migrationsPayload/index.js"
import adaptProtocols from "../utils/adaptProtocols.js"
// Import { sha256, } from 'js-sha256'

export default async ({ schema, stateItem }) => {
  const storedProtocolsStruct = stateItem.protocols
    ? JSON.parse(stateItem.protocols)
    : null
  // Const s = sha256(JSON.stringify(storedProtocolsStruct))

  const targetProtocolsStruct = await adaptProtocols({
    protocols: schema.protocols
  })
  // Const t = sha256(JSON.stringify(targetProtocolsStruct))


  const items = await getMigrationsPayload({
    a: storedProtocolsStruct,
    b: targetProtocolsStruct,
    protocols: schema.protocols
  })

  return items
}
