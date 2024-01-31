export default async (props) => {
  const {
    feature,
    app,
    schema,
    configuration,
    server,
    servableConfig,
    engine,
    allFeatures
  } = props

  let file = await feature.loader.beforeInit()
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
    allFeatures,
    feature
  })
}
