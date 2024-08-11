import registerProtocol from "./register/index.js"

export default async ({ schema, servableConfig }) => {
  const {
    protocols
  } = schema
  console.log("[Servable]", `Launch > Wire schema > Start`)
  await Promise.all(protocols.map(async protocol => {
    await registerProtocol({
      protocol,
      servableConfig,
      allProtocols: protocols
    })
  }))
  console.log("[Servable]", `Launch > Wire schema > Success`)
}
