// Answers whether the row was destroyed (counted by the afterDelete, ../orphanSignals.js); a failure is logged, never thrown.
export default async i => {
    try {
        i.isDataAvailable && !i.isDataAvailable() && i.fetch && await i.fetch({ useMasterKey: true }) // The check will skip files
        await i.destroy({ useMasterKey: true })
        return true
    } catch (e) {
        console.error('Protocol > disposableorphansable > destroyItem', e.message)
        return false
    }
}
