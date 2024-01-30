export default async (props) => {
  const {
    feature,
    app,
    schema,
    configuration,
    server,
    servableConfig,
    frameworkBridge,
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
    frameworkBridge,
    allFeatures,
    feature
  })
}
