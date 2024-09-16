
export default async (props) => {
    const { schema, servableConfig, config, item, } = props

    item.system = {
        ...(item.system ? item.system : {}),
        docker: config
    }
}
