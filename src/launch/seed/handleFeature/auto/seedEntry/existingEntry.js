
export default async (props) => {
    const {
        className,
        uniqueRef } = props

    if (!uniqueRef) {
        return null
    }

    if (!className) {
        return null
    }

    const query = new Servable.App.Query(className)
    query.equalTo('uniqueRef', uniqueRef)
    return query.first({ useMasterKey: true })
}