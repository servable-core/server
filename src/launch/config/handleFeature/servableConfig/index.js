import create from "./crud/create.js"
import get from "./crud/get.js"

export default async (props) => {
    const {
        feature,
        candidate,
    } = props

    let result = await get({ feature })
    if (result) {
        return result
    }

    return create({ feature })
}
