import doMigrate from "./doMigrate.js"
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

      result = await doMigrate(props)
    }

    let _schema = result.schema ? result.schema : schema
    await didMigrateSuccessfully({
      configuration,
      schema: _schema
    })
    // const { protocolsExcerpt } = _schema
    // await Servable.App.Config.save(null)

    return result

  } catch (error) {
    console.error("[SERVABLE]", "didnotmigrate", error)
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
