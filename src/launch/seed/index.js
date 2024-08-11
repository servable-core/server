import protocolCandidates from "./protocolCandidates/index.js"
import handleProtocol from './handleProtocol/index.js'
import _ from 'underscore'

export default async ({ schema, configuration, operationProps }) => {

  const {
    protocols
  } = schema

  console.log("[Servable]", `Launch > Seed > Start >`)
  const candidates = _.flatten(await Promise.all(protocols.map(async protocol =>
    protocolCandidates({
      protocol,
    })
  ))).filter(a => a)

  const cache = {}
  for (var i in candidates) {
    const protocol = candidates[i]
    await handleProtocol({
      operationProps,
      protocols: candidates,
      protocol,
      cache,
      configuration
    })
  }

  console.log("[Servable]", `Launch > Seed > End`)
}
