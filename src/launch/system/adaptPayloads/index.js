import handleProtocol from "./handleProtocol/index.js"

export default async ({
  schema,
  servableConfig,
  engine
}) => {
  const {
    protocols,
  } = schema

  const items = await Promise.all(protocols.map(async protocol => {
    return handleProtocol({
      schema,
      protocol,
      servableConfig,
      engine
    })
  }))
}
