

export default async (props) => {
    const {
        item,
        servableConfig,
    } = props

    const query = new Servable.App.Query('ServableConfigEntryInCondition')
    query.equalTo('featureConfig', servableConfig)
    query.equalTo('key', item.key)
    return query.first({ useMasterKey: true })
}
