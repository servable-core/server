
export default async props => {
    const {
        user,
        installation,
        useMasterKey,
        ip,
        headers,
        options,
        condition,
        conditionValue,
        conditionType } = props

    if (options && options.locale) {
        const a = await doMeet({ ...props, locale: options.locale })
        return a
    }

    if (!user) {
        return false
    }
    !user.isDataAvailable() && await user.fetch({ useMasterKey })
    const locale = user.get('locale')
    if (!locale) {
        return false
    }
    return doMeet({ ...props, locale })
}

const doMeet = async (props) => {
    const {
        locale,
        user,
        installation,
        useMasterKey,
        ip,
        headers,
        options,
        condition,
        conditionValue,
        conditionType } = props
    const { params } = conditionValue
    const { values } = params
    return values.includes(locale)
}