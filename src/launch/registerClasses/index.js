import registerProtocol from "./registerProtocol/index.js"

export default async ({ schema }) => {
  const {
    protocols
  } = schema
  console.log("[Servable]", `Launch > Register class > Start`)
  await Promise.all(protocols.map(async protocol => {
    await registerProtocol({
      protocol,
      allProtocols: protocols,
    })
  }))
  console.log("[Servable]", `Launch > Register class > Success`)
}
