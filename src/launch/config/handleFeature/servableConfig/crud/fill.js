

export default async (props) => {
    const {
        item,
        feature,
        servableConfig,
        object
    } = props

    object.set('featureId', feature.id)
}
