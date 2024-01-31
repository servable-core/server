import perform from '../../perform/index.js'

export default async (props) => {
  const {
    configuration,
    app,
    schema,
    engine
  } = props

  let result

  const bootConfig = { ...configuration.config }
  delete bootConfig.parse.schema
  await engine.doLaunch({
    config: bootConfig,
    app
  })
  Servable.schema = schema

  result = await perform(props)

  return {
    ...result,
  }
}
