import getStateForConfiguration from "../../../../../lib/utilsDatabase/classes/parseServerState/functions/stateForConfiguration.js"
import MigrationStateEnum from "../../../../../lib/utilsDatabase/classes/parseServerState/enums/migrationState.js"
import ValidationStateEnum from "../../../../../lib/utilsDatabase/classes/parseServerState/enums/validationState.js"

export default async (props) => {
  const item = await getStateForConfiguration(props)

  item.migrationState = MigrationStateEnum.Initial
  item.validationState = ValidationStateEnum.Initial

  item.updatedAt = Date.now()

  await item.save()
}
