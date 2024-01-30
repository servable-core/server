import fill from './fill.js'

export default async (props) => {
    const {
        feature
    } = props

    const object = new Servable.App.Object('ServableConfig')
    await fill({ ...props, object })
    return object.save(null, { useMasterKey: true })
}
