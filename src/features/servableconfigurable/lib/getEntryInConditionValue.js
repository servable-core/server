
export default async (item) => {
    const valueType = item.get('valueType')
    switch (valueType) {
        default:
        case 'string': {
            return item.get('valueString')
        }
        case 'number': {
            return item.get('valueNumber')
        }
        case 'boolean': {
            return item.get('valueBoolean')
        }
        case 'object': {
            return item.get('valueObject')
        }
    }
}
