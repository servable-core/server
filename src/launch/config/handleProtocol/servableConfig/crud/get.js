

export default async (props) => {
    const {
        protocol
    } = props

    const query = new Servable.App.Query('ServableConfig')
    query.equalTo('protocolId', protocol.id)
    return query.first({ useMasterKey: true })
}
