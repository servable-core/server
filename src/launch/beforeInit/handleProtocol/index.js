export default async (props) => {
  const {
    protocol,
    app,
    schema,
    configuration,
    server,
    servableConfig,
    engine,
    allProtocols
  } = props

  let file = await protocol.loader.beforeInit()
  if (!file) {
    return
  }

  await file({
    app,
    schema,
    configuration,
    server,
    servableConfig,
    engine,
    allProtocols,
    protocol
  })
}
