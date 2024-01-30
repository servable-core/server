import perform from '../../perform/index.js'
import setupDecoydatabase from '../utils/decoyDatabase/setup/subset/index.js'
// import tearDownDecoydatabase from '../utils/decoyDatabase/tearDown'

// import adaptConfigToConfiguration from './adaptConfigToConfiguration'


export default async (props) => {
  const {
    configuration,
    app,
    schema,
    migrationPayload,
    frameworkBridge
  } = props

  let result
  //TODO: double


  await setupDecoydatabase({ configuration, })

  if (!migrationPayload || !migrationPayload.length) {
    result = await frameworkBridge.launchWithMigration({
      schema,
      configuration,
      app
    })
  }
  else {
    const bootConfig = { ...configuration.config }
    delete bootConfig.parse.schema
    await frameworkBridge.doLaunch({
      config: bootConfig,
      app
    })
    Servable.schema = schema

    result = await perform({
      ...props,
    })
  }

  return result
}
