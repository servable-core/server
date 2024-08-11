export default async (props) => {
    const {
        key,
        options = {},
    } = props

    const query = new Servable.App.Query('ServableConfigEntry')
    if (options && options.protocol && options.protocol.id) {
        const innerQuery = new Servable.App.Query('ServableConfig')
        innerQuery.equalTo('protocolId', options.protocol.id)
        query.matchesQuery('protocolConfig', innerQuery)
    }
    // query.equalTo('protocolConfig', servableConfig)
    query.equalTo('key', key)
    query.include(['values', 'values.condition'])
    const i = await query.first({ useMasterKey: true })
    return i
}
