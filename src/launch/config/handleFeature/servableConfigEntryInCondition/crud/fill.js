
export default async (props) => {
    const {
        servableConfig,
        entry,
        condition,
        conditions,
        conditionKey = 'none',
        object,
    } = props
    let _condition = condition
    if (!_condition && conditions) {
        let _conditions = conditions.filter(a => a.get('key') === conditionKey)
        if (_conditions && _conditions.length) {
            _condition = _conditions[0]
        }
    }

    // if (!condition && conditionKey) {
    //     condition = await getServableConfigCondition({
    //         key: conditionKey,
    //         servableConfig
    //     })
    // }    

    // object.set('entry', entry)
    object.set('condition', _condition)
    // if (_condition) {
    object.set('conditionKey', props.conditionKey)
    object.set('valueUseInApp', props.valueUseInApp)
    object.set('valueType', props.valueType)
    object.set('priority', props.priority)

    // object.fillValue(props.value, props.valueType)
    switch (props.valueType) {
        default:
        case 'string': {
            object.set('valueString', props.value)
            break
        }
        case 'number': {
            object.set('valueNumber', props.value)
            break
        }
        case 'boolean': {
            object.set('valueBoolean', props.value)
            break
        }
        case 'object': {
            object.set('valueObject', props.value)
            break
        }
    }
    // }
}
