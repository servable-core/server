import getStateForConfiguration from "../../../../../lib/utilsDatabase/classes/parseServerState/functions/stateForConfiguration.js"
import adaptProtocols from "../../../utils/adaptProtocols.js"
// import adaptAppConfigBeforeSave from "../../../utils/adaptAppConfigBeforeSave"

export default async (props) => {
  const item = await getStateForConfiguration(props)

  const { schema, configuration } = props
  // const { config: appConfig } = configuration
  const protocols = await adaptProtocols({ protocols: schema.protocols })

  item.classes = JSON.stringify(schema.appProtocol.schema.classes.all)

  item.protocols = protocols
    ? JSON.stringify(protocols)
    : null

  // item.appConfig = adaptAppConfigBeforeSave(appConfig)
  item.updatedAt = Date.now()
  await item.save()
}
