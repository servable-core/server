import protocolCandidates from "./protocolCandidates/index.js"
import _ from 'underscore'

export default async (props) => {
  const { schema } = props
  const {
    protocols
  } = schema

  const items = _.flatten(await Promise.all(protocols.map(async item =>
    protocolCandidates({
      item,
      allProtocols: protocols
    })
  ))).filter(a => a)

  return items
}
