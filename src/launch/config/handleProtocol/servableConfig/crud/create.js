import fill from './fill.js'

export default async (props) => {
    const {
        protocol
    } = props

    const object = new Servable.App.Object('ServableConfig')
    await fill({ ...props, object })
    return object.save(null, { useMasterKey: true })
}
