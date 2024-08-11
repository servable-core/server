import handleProtocol from "./handleProtocol/index.js"

export default async ({
  app,
  schema,
  configuration,
  server,
  servableConfig,
  engine }) => {

  const {
    protocols
  } = schema
  console.log("[Servable]", `Launch > Before init > Start`)
  await Promise.all(protocols.map(async protocol => {
    await handleProtocol({
      app,
      schema,
      configuration,
      server,
      servableConfig,
      engine,
      protocol,
      allProtocols: protocols
    })
  }))
  console.log("[Servable]", `Launch > Before init > Success`)
}
