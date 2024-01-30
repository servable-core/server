import getStateForConfiguration from "../../../../../lib/utilsDatabase/classes/parseServerState/functions/stateForConfiguration.js"
import adaptFeatures from "../../../utils/adaptFeatures.js"
// import adaptAppConfigBeforeSave from "../../../utils/adaptAppConfigBeforeSave"
import MigrationStateEnum from "../../../../../lib/utilsDatabase/classes/parseServerState/enums/migrationState.js"

export default async (props) => {
  const item = await getStateForConfiguration(props)

  const { schema, configuration } = props
  // const { config: appConfig } = configuration
  const features = await adaptFeatures({ features: schema.features })

  item.classes = JSON.stringify(schema.appFeature.schema.classes.all)

  item.migrationState = MigrationStateEnum.LoadedSuccessfully

  item.features = features
    ? JSON.stringify(features)
    : null


  // item.appConfig = adaptAppConfigBeforeSave(appConfig)

  item.updatedAt = Date.now()
  item.lastMigrationEndedAt = Date.now()
  // item.lastMigrationStartedAt = null
  item.migrationsAttempts = 0
  item.migrationFailureError = null
  await item.save()
}
