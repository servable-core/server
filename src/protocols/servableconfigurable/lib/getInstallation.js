
export default async (installationId) => {
    if (!installationId) {
        return null
    }

    const query = new Servable.App.Query('_Installation')
    query.equalTo('installationId', installationId)
    return query.first({ useMasterKey: true })
}
