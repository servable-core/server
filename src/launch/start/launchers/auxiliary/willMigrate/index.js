import getStateForConfiguration from "../../../../../lib/utilsDatabase/classes/parseServerState/functions/stateForConfiguration.js"
import adaptProtocols from "../../../utils/adaptProtocols.js"
// import adaptAppConfigBeforeSave from "../../../utils/adaptAppConfigBeforeSave"
import MigrationStateEnum from "../../../../../lib/utilsDatabase/classes/parseServerState/enums/migrationState.js"


export default async (props) => {
  const item = await getStateForConfiguration(props)

  const { schema, configuration } = props
  // const { config: appConfig } = configuration
  const protocols = await adaptProtocols({ protocols: schema.protocols })

  item.migrationState = MigrationStateEnum.Loading
  item.classesTarget = JSON.stringify(schema.appProtocol.schema.classes.all)
  item.protocolsTarget = protocols
    ? JSON.stringify(protocols)
    : null

  // item.appConfigTarget = adaptAppConfigBeforeSave(appConfig)

  item.updatedAt = Date.now()
  item.lastMigrationEndedAt = null
  item.lastMigrationStartedAt = Date.now()
  item.migrationsAttempts = item.migrationsAttempts + 1

  await item.save()
}
