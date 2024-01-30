

export default async (props) => {
    const {
        feature
    } = props

    const query = new Servable.App.Query('ServableConfig')
    query.equalTo('featureId', feature.id)
    return query.first({ useMasterKey: true })
}
