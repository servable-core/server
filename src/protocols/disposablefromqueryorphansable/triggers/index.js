export const afterDelete = async ({ request }) => {
    const { object } = request

    if (!object || !object.disposableOrphans) {
        return
    }

    const items = object.disposableFromQueryOrphansQueries()
    await Promise.all(items.map(child => handleItem({ object, child })))
}

export const beforeSaveValidator = {
    fields: {

    }
}

const handleItem = async ({ object, query }) => {
    if (!object) {
        return
    }

    //#TODO

    // var objects = object.get(child)

    // if (!objects) {
    //     return
    // }

    // if (!Array.isArray(objects)) {
    //     objects = [objects].filter(a => a)
    // }

    // if (!objects.length) {
    //     return
    // }

    // await Promise.all(objects.map(destroyItem))
}

const destroyItem = async i => {
    try {
        i.isDataAvailable && !i.isDataAvailable() && i.fetch && await i.fetch({ useMasterKey: true }) // The check will skip files
        await i.destroy({ useMasterKey: true })
    } catch (e) {
        console.error('Protocol > dependentChildren > destroyItem', e.message)
    }
}

const iterateQuery = async ({ query, limit }) => {
    const page = 0

}
