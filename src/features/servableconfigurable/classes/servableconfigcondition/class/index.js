
export default class ServableConfigCondition extends Servable.App.Object {

  constructor() {
    super('ServableConfigCondition')
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

  async isMet(props) {
    const { user, installation } = props
    const key = this.get('key')
    const values = this.get('values')
    const meetings = await Promise.all(values.map(async value => this.valueIsMet({ ...props, value })))
    return !meetings.includes(false)
  }

  async valueIsMet(props) {
    const { user, installation, value } = props
    const { type, params } = value
    const conditionType = await getConditionType({ type })
    if (!conditionType) {
      return false
    }

    return conditionType.isMet({ ...props, condition: this, conditionValue: value })
  }
}

const getConditionType = async ({ type }) => {
  return (new Servable.App.Query('ServableConfigConditionType')).equalTo('type', type).first({ useMasterKey: true })
}
