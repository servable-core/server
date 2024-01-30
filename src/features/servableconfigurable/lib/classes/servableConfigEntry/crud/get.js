export default async (props) => {
    const {
        key,
        options = {},
    } = props

    const query = new Servable.App.Query('ServableConfigEntry')
    if (options && options.feature && options.feature.id) {
        const innerQuery = new Servable.App.Query('ServableConfig')
        innerQuery.equalTo('featureId', options.feature.id)
        query.matchesQuery('featureConfig', innerQuery)
    }
    // query.equalTo('featureConfig', servableConfig)
    query.equalTo('key', key)
    query.include(['values', 'values.condition'])
    const i = await query.first({ useMasterKey: true })
    return i
}
