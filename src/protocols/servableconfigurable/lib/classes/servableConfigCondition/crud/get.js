

export default async (props) => {
    const {
        item,
        servableConfig,
        key
    } = props

    const query = new Servable.App.Query('ServableConfigCondition')
    query.equalTo('protocolConfig', servableConfig)
    query.equalTo('key', key ? key : item.key)
    return query.first({ useMasterKey: true })
}
