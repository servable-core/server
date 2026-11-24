// Answers whether the file was destroyed (counted by the afterDelete, ../orphanSignals.js); a failure is logged, never thrown.
export default async i => {
    try {
        await i.destroy({ useMasterKey: true })
        return true
    } catch (e) {
        console.error('Protocol > disposableorphansable > destroyItem', e.message)
        return false
    }
}
