import servableConfigEntryGet from "../lib/classes/servableConfigEntry/crud/get.js"
import getEntryInConditionValue from "../lib/getEntryInConditionValue.js"
import getInstallation from "../lib/getInstallation.js"

export const get = async request => {
    const { user, params } = request
    const { key, options } = params

    const item = await servableConfigEntryGet({ key, options })
    if (!item) {
        return null
    }
    const entriesInConditions = item.get('values')
    if (!entriesInConditions || !entriesInConditions.length) {
        return null
    }
    let results = []

    const { master, ip, headers } = request
    const installation = await getInstallation(request.installationId)

    await Promise.all(entriesInConditions.map(async entryInCondition => {
        !entryInCondition.isDataAvailable() && await entryInCondition.fetch({ useMasterKey: true })

        const condition = entryInCondition.get('condition')
        if (!condition) {
            return
        }

        const isEnabled = condition.get('isEnabled')
        if (!isEnabled) {
            return
        }

        const priority = entryInCondition.get('priority')

        !condition.isDataAvailable() && await condition.fetch({ useMasterKey: true })
        const isMet = await condition.isMet({ user, installation, useMasterKey: master, ip, headers, options })
        if (!isMet) {
            return
        }

        const result = await getEntryInConditionValue(entryInCondition)
        results.push({
            priority,
            result
        })
        // result = entryInCondition.value()
    }))

    if (!results || !results.length) {
        return null
    }

    results.sort((a, b) => { if (a.priority > b.priority) { return -1 }; if (a.priority < b.priority) { return 1 }; return 0 })
    return results[0].result
}
