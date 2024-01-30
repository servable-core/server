
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
    if (_condition) {
        object.set('conditionKey', _condition.get('key'))
    }
}
