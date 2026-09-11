

export default class ServableConfigEntryInCondition extends Servable.App.Object {

  constructor() {
    super('ServableConfigEntryInCondition')
  }

  /* #region disposablechildrenable */
  disposableChildren() {
    const items = super.disposableChildren ? super.disposableChildren() : []
    return [
      ...items,
    ]
  }
  /* #endregion */

  /* #region disposableorphansable */
  disposableOrphans = () => {
    const items = super.disposableOrphans ? super.disposableOrphans() : []
    return [
      ...items,

    ]
  }
  /* #endregion */


  value() {
    const valueType = this.get('valueType')
    switch (valueType) {
      default:
      case 'string': {
        return this.get('valueString')
      }
      case 'number': {
        return this.get('valueNumber')
      }
      case 'boolean': {
        return this.get('valueBoolean')
      }
      case 'object': {
        return this.get('valueObject')
      }
    }
  }

  fillValue(value, valueType) {
    switch (valueType) {
      default:
      case 'string': {
        this.set('valueString', value)
        break
      }
      case 'number': {
        this.set('valueNumber', value)
        break
      }
      case 'boolean': {
        this.set('valueBoolean', value)
        break
      }
      case 'object': {
        this.set('valueObject', value)
        break
      }
    }
  }
}
