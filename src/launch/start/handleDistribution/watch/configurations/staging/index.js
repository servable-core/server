import ValidationStateEnum from "../../../../../../utils/utilsDatabase/classes/parseServerState/enums/validationState.js"
import quit from "../../../../boot/quit.js"
import perform from "../../../../boot/index.js"

export default async (props) => {
  const { configuration, item, data } = props
  //When we arrive here, it means we are running the server in stagind mode.
  //We are in a pod that is for staging.
  if (!item) {
    return
  }

  const validationState = item.validationState
  switch (validationState) {
    case ValidationStateEnum.ValidationRequested:
      {
        item.validationState = ValidationStateEnum.Validated
        await item.save()
      } break
    case ValidationStateEnum.Validated:
      {
        await perform({ ...props.performProps })
        quit({ delay: 0, error: new Error('Being in a staging configuration, and given the previous migration has been validated >> Restarting the server to take migrations to production.') })

        // item.migrationState = 0
        // await item.save()
      } break
    case ValidationStateEnum.Invalidated: {
      // item.migrationState = 0
      // await item.save()
    } break
    case 3:
    case 2: {

    } break
    default: {
    } break
  }
}
