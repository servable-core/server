

export default class ServableConfig extends Servable.App.Object {

  constructor() {
    super('ServableConfig')
  }

  /* #region disposablechildrenable */
  disposableChildren() {
    const items = super.disposableChildren ? super.disposableChildren() : []
    return [
      ...items,
      'conditions',
      'groups',
      'entries',

    ]
  }
  /* #endregion */

  /* #region disposableorphansable */
  disposableOrphans = () => {
    const items = super.disposableOrphans ? super.disposableOrphans() : []
    return [
      ...items,
      'conditions',
      'groups',
      'entries',
    ]
  }
  /* #endregion */
}
