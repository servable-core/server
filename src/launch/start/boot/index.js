import migrate from '../migrate/index.js'
import quit from './quit.js'
import qualify from './qualify.js'

export default async ({
  servableConfig,
  app,
  schema,
  engine }) => {

  const {
    stateItem,
    configuration,
    shouldQuit,
    shouldQuitError,
    shouldMigrate,
    waitBeforeQuit,
    migrations
  } = await qualify({
    servableConfig,
    app,
    schema,
    engine,
    schema,
  })

  const hasBeenInitialized = stateItem.lastMigrationEndedAt
  let result

  if (shouldQuit) {
    console.log('[SERVABLE]', '[DEBUG]', 'boot>production should quit')
    quit({
      delay: waitBeforeQuit,
      error: shouldQuitError
    })
    return
  }

  if (shouldMigrate) {
    console.log('[SERVABLE]', '[DEBUG]', 'boot>production should migrate')
    result = await migrate({
      app,
      hasBeenInitialized,
      schema,
      migrationPayload: migrations,
      servableConfig,
      configuration: configuration,
      engine
    })

    if (result.error) {
      console.log('[SERVABLE]', '[DEBUG]', 'boot>production result error', result.error)
      quit(result)
      return null
    }

    return {
      ...result,
      schema,
      configuration
    }
  }

  console.log('[SERVABLE]', '[DEBUG]', 'boot>launch with no migration')
  result = await engine.launchWithNoMigration({
    app,
    schema,
    configuration
  })

  return {
    ...result,
    schema,
    configuration,
  }
}
