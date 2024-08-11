import create from "./crud/create.js"
import get from "./crud/get.js"

export default async (props) => {
    const {
        protocol,
        candidate,
    } = props

    let result = await get({ protocol })
    if (result) {
        return result
    }

    return create({ protocol })
}
