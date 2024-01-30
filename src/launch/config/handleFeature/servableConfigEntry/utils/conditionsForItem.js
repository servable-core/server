
export default async (props) => {
    const {
        item,
        conditions,
    } = props

    if (!item.conditions || !item.conditions.length) {
        return null
    }

    if (!conditions || !conditions.length) {
        return null
    }

    return conditions.map(condition => {
        const contains = item.conditions.filter(a => (a.key === condition.get('key'))).length
        return contains ? condition : null
    })
}


