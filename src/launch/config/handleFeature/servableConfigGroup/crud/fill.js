

export default async (props) => {
    const {
        item,
        servableConfig,
        object
    } = props

    object.set('featureId', servableConfig.get('featureId'))
    object.set('key', item.key)
    object.set('uniqueRef', item.key)
    object.set('description', item.description)
    object.set('isEnabled', item.isEnabled)
    object.set('featureConfig', servableConfig)
    object.set('name', item.name)
}
