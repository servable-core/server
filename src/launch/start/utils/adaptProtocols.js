import { sha256, } from 'js-sha256'

export default async ({ protocols }) => {
  return Promise.all(protocols.map(adaptProtocol))
}

const adaptProtocol = async (protocol) => {
  const classes = await protocol.loader.classesSchemas()
  const schema = await protocol.loader.schemaRaw({ ad: "ee" })
  const schemaSHA = sha256(JSON.stringify(schema ? schema : classes))

  return {
    id: protocol.id,
    version: protocol.version,
    classes,
    schema,
    schemaSHA,
  }
}
