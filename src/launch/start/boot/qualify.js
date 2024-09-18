import stateForConfiguration from '../../../lib/utilsDatabase/classes/parseServerState/functions/stateForConfiguration.js'
import _migrations from './migrations.js'

const MAX_ATTEMPTS = 5
const MAX_DURATION = 10 //in second

import MigrationStateEnum from '../../../lib/utilsDatabase/classes/parseServerState/enums/migrationState.js'


export default async (props) => {
  const {
    servableConfig: { configuration },
    schema,
  } = props

  if (!configuration) {
    return {}
  }

  const productionStateItem = await stateForConfiguration({ configuration })
  const migrations = await _migrations({ schema, stateItem: productionStateItem })

  switch (productionStateItem.migrationState) {
    case MigrationStateEnum.Initial: {
      // if (!stateItem.protocols) {
      //   return {
      //     stateItem,
      //     configuration,
      //     shouldMigrateReset: true,
      //   }
      // }

      return {
        stateItem: productionStateItem,
        configuration,
        migrations,
        shouldMigrate: true,
      }
    }
    case MigrationStateEnum.Loading: {
      if (productionStateItem.lastMigrationStartedAt) {
        const delta = Math.abs(productionStateItem.lastMigrationStartedAt.getTime() - Date.now()) / 1000
        if (delta > MAX_DURATION) {
          return {
            stateItem: productionStateItem,
            configuration,
            migrations,
            shouldMigrate: Boolean(
              migrations
              && migrations.length
              && productionStateItem.lastMigrationEndedAt)
          }
        }
      }

      if (productionStateItem.migrationsAttempts > MAX_ATTEMPTS) {
        return {
          stateItem: productionStateItem,
          configuration,
          shouldQuit: true,
          shouldQuitError: new Error("Maximum attempts reached"),
          waitBeforeQuit: 0
        }
      }

      return {
        stateItem: productionStateItem,
        configuration,
        shouldQuit: true,
        waitBeforeQuit: 5000,
        shouldQuitError: new Error("Another migration is being performed"),
      }
    }
    case MigrationStateEnum.LoadedSuccessfully: {
      return {
        stateItem: productionStateItem,
        configuration,
        migrations,
        shouldMigrate: Boolean(migrations && migrations.length),
      }
      // if (stateItem.migrationsAttempts > MAX_ATTEMPTS) {
      //   return {
      //     stateItem,
      //     configuration,
      //     shouldQuit: true,
      //     waitBeforeQuit: 5000,
      //     shouldQuitError: new Error("Migration attempts exceeded"),
      //   }
      // }
    } break
    default: break
  }

  return {
    stateItem: productionStateItem,
    configuration,
    migrations,
    shouldMigrate: Boolean(
      migrations
      && migrations.length
      && productionStateItem.lastMigrationEndedAt)
  }
}
