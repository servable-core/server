

export default async (props) => {
    const {
        item,
        protocol,
        servableConfig,
        object
    } = props

    object.set('protocolId', protocol.id)
}
