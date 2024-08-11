export default async i => {
    try {
        i.isDataAvailable && !i.isDataAvailable() && i.fetch && await i.fetch({ useMasterKey: true }) // The check will skip files
        await i.destroy({ useMasterKey: true })
    } catch (e) {
        console.error('Protocol > disposableorphansable > destroyItem', e.message)
    }
}
