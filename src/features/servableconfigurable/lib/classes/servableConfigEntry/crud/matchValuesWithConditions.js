import createServableConfigEntryInCondition from "../../servableConfigEntryInCondition/crud/create.js"

export default async (props) => {
  const {
    item,
    servableConfig,
    object,
    conditions
  } = props

  const { values } = item
  let _i

  if (!values || !values.length) {
    _i = [{
      conditionKey: 'none',
    }]
  }
  else {
    _i = values.map(value => ({
      ...value,
    }))

    const noneExists = _i.filter(a => a.conditionKey === 'none').length
    if (!noneExists) {
      const emptyItems = _i.filter(a => !a.conditionKey)
      if (emptyItems && emptyItems.length) {
        _i = _i.filter(a => a.conditionKey)
        _i = _i.push({
          conditionKey: 'none',
          ...emptyItems[0],

        })
      } else {
        _i.push({
          conditionKey: 'none',
        })
      }
    }
  }

  try {
    _i = await Promise.all(_i.map(async i =>
      createServableConfigEntryInCondition({
        servableConfig,
        conditions,
        entry: object,
        ...i
      })
    ))
  } catch (e) {
    console.error(e)
  }


  object.set('values', _i)
}
