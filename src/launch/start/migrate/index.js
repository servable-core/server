import staging from "./configuration/staging/index.js"
import production from "./configuration/production/index.js"
import didMigrateSuccessfully from "../launchers/auxiliary/didMigrateSuccessfully/index.js"
import willMigrate from '../launchers/auxiliary/willMigrate/index.js'
import didNotMigrateError from '../launchers/auxiliary/didNotMigrateError/index.js'

export default async (props) => {
  const {
    configuration,
    hasBeenInitialized,
    schema,
    app,
    engine
  } = props

  try {
    let result
    if (!hasBeenInitialized) {
      result = await engine.launchWithMigration({
        schema,
        configuration,
        app
      })
    }
    // else if (!migrationPayload || !migrationPayload.length) {
    //   result = await launchWithNoMigration({
    //     schema,
    //     configuration,
    //     app
    //   })
    // }
    else {
      await willMigrate({
        configuration,
        schema,
      })

      switch (configuration.key) {
        case 'staging': {
          result = await staging(props)
        } break
        case 'production':
        default: {
          result = await production(props)
        } break
      }
    }

    let _schema = result.schema ? result.schema : schema
    await didMigrateSuccessfully({
      configuration,
      schema: _schema
    })
    // const { featuresExcerpt } = _schema
    // await Servable.App.Config.save(null)

    return result

  } catch (error) {
    await didNotMigrateError({
      configuration,
      schema,
      error,
    })
    return {
      error
    }
  }
}
