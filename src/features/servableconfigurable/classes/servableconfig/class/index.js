

export default class ServableConfig extends Servable.App.Object {

    constructor() {
        super('ServableConfig')
    }

    /* #region disposablechildrenable */
    disposableChildren = () => ([
        'conditions',
        'groups',
        'entries',

    ])
    /* #endregion */

    /* #region disposableorphansable */
    disposableOrphans = () => ([
        'conditions',
        'groups',
        'entries',
    ])
    /* #endregion */
}