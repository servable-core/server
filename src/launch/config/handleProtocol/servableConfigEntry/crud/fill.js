import matchValuesWithConditions from "./matchValuesWithConditions.js"


export default async (props) => {
  const {
    item,
    servableConfig,
    object,
  } = props

  object.set('protocolId', servableConfig.get('protocolId'))
  object.set('key', item.key)
  object.set('uniqueRef', item.key)
  object.set('description', item.description)
  object.set('isEnabled', item.isEnabled)
  object.set('protocolConfig', servableConfig)

  await matchValuesWithConditions(props)
}
