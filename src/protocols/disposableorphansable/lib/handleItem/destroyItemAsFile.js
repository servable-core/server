export default async i => {
    try {
        await i.destroy({ useMasterKey: true })
    } catch (e) {
        console.error('Protocol > disposableorphansable > destroyItem', e.message)
    }
}
