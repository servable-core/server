import platformIsMet from './lib/isMet/platform/index.js'
import localeIsMet from './lib/isMet/locale/index.js'
// import countryIsMet from './lib/isMet/country/index.js'
// import dateTimeIsMet from './lib/isMet/dateTime/index.js'
// import firstOpenIsMet from './lib/isMet/firstOpen/index.js'
// import userExistsIsMet from './lib/isMet/userExists/index.js'
// import buildNumberIsMet from './lib/isMet/buildNumber/index.js'
// import versionIsMet from './lib/isMet/version/index.js'

export default class ServableConfigConditionType extends Servable.App.Object {

    constructor() {
        super('ServableConfigConditionType')
    }

    /* #region disposablechildrenable */
    disposableChildren = () => ([

    ])
    /* #endregion */

    /* #region disposableorphansable */
    disposableOrphans = () => ([

    ])
    /* #endregion */

    async isMet(props) {
        const { user, installation } = props
        const type = this.get('type')
        switch (type) {
            case 'platform': {
                return platformIsMet({ conditionType: this, ...props })
            }
            case 'locale': {
                return localeIsMet({ conditionType: this, ...props })
            }
            default: {
                return false
            }
        }
    }
}