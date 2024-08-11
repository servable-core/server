import stateForConfiguration from '../../../../../lib/utilsDatabase/classes/parseServerState/functions/stateForConfiguration.js'
import _ from 'underscore'
import _migrations from '../../migrations.js'

const MAX_ATTEMPTS = 5
const MAX_DURATION = 10 //in second

import MigrationStateEnum from '../../../../../lib/utilsDatabase/classes/parseServerState/enums/migrationState.js'


export default async (props) => {
  const {
    servableConfig: { configurations },
    schema,
    stagingStateItem } = props

  let configuration = _.findWhere(configurations, { key: 'production' })
  if (!configuration) {
    return {}
  }

  const productionStateItem = await stateForConfiguration({ configuration })
  const migrations = await _migrations({ schema, stateItem: productionStateItem })

  // if (stagingStateItem) {
  //   switch (stagingStateItem.validationState) {
  //     case ValidationStateEnum.Validated: {
  //       return {
  //         stateItem: productionStateItem,
  //         configuration,
  //         migrations,
  //         shouldMigrate: true,
  //       }
  //     }
  //     case ValidationStateEnum.Invalidated: {
  //       return {
  //         stateItem: productionStateItem,
  //         configuration,
  //         migrations,
  //       }
  //     }
  //     case ValidationStateEnum.Initial:
  //     default:
  //       {
  //         switch (stagingStateItem.migrationState) {
  //           case MigrationStateEnum.Loading:
  //           case MigrationStateEnum.LoadedSuccessfully:
  //           case MigrationStateEnum.ErrorLoading: {
  //             return {
  //               stateItem: productionStateItem,
  //               configuration,
  //             }
  //           }
  //           default:
  //             break
  //         }
  //       }
  //       break
  //   }
  // }

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
