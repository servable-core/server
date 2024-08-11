import getStateForConfiguration from "../../../../../lib/utilsDatabase/classes/parseServerState/functions/stateForConfiguration.js"
import adaptProtocols from "../../../utils/adaptProtocols.js"
// import adaptAppConfigBeforeSave from "../../../utils/adaptAppConfigBeforeSave"
import MigrationStateEnum from "../../../../../lib/utilsDatabase/classes/parseServerState/enums/migrationState.js"

export default async (props) => {
  const item = await getStateForConfiguration(props)

  const { schema, configuration } = props
  // const { config: appConfig } = configuration
  const protocols = await adaptProtocols({ protocols: schema.protocols })

  item.classes = JSON.stringify(schema.appProtocol.schema.classes.all)

  item.migrationState = MigrationStateEnum.LoadedSuccessfully

  item.protocols = protocols
    ? JSON.stringify(protocols)
    : null


  // item.appConfig = adaptAppConfigBeforeSave(appConfig)

  item.updatedAt = Date.now()
  item.lastMigrationEndedAt = Date.now()
  // item.lastMigrationStartedAt = null
  item.migrationsAttempts = 0
  item.migrationFailureError = null
  await item.save()
}
