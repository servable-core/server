import MigrationStateEnum from "../../../../../../utils/utilsDatabase/classes/parseServerState/enums/migrationState.js"
import quit from "../../boot/quit.js"

export default async (props) => {
  const { item } = props
  //When we arrive here, it means we are running the server in production mode.
  //We are in a pod that is for staging.

  if (!item) {
    return
  }

  const migrationState = item.migrationState
  switch (migrationState) {
    case MigrationStateEnum.Loading:
      {
        quit({ delay: 0, error: new Error('Being in a production configuration, and given there is a migration going on >> Restarting the server to wait for migrations to end elsewhere.') })
        // await perform({ ...props.performProps })

      } break
    default: {
    } break
  }
}
