import handleProtocol from "./handleProtocol/index.js";

export default async ({ app, schema, configuration, server, servableConfig, engine }) => {
  const {
    protocols
  } = schema
  console.log("[Servable]", `Launch > After init > Start`)
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP']

  for (const signal of signals) {
    process.on(signal, async () => {
      Servable.Process.status = 'exit'
      console.log(`Received ${signal}, shutting down gracefully...`)
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

      process.exit(0)
    })
  }
}
