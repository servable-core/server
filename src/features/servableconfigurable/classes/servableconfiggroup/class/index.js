

export default class ServableConfigGroup extends Servable.App.Object {

  constructor() {
    super('ServableConfigGroup')
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
}
