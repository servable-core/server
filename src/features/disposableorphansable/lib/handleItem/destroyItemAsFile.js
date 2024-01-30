export default async i => {
    try {
        await i.destroy({ useMasterKey: true })
    } catch (e) {
        console.error('Feature > disposableorphansable > destroyItem', e.message)
    }
}
