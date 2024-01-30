import _ from 'underscore'

export const afterSave = async ({ request }) => {
    const { object, original, context } = request

    if (!object || !object.disposableChildren) {
        return
    }
    const { dirtyKeys } = context
    if (!dirtyKeys || !dirtyKeys.length) {
        return
    }

    const items = object.disposableChildren()
    if (!items || !items.length) {
        return
    }

    const candidates = _.intersection(items, dirtyKeys)
    if (!candidates || !candidates.length) {
        return
    }

    await Promise.all(candidates.map(key => handleItem({ object, original, key })))
}

const handleItem = async ({ object, original, key }) => {
    if (!original) {
        return
    }

    const previous = original.get(key)
    const current = object.get(key)

    if (Array.isArray(previous) || Array.isArray(current)) {
        return handleArray({ previous, current })
    }

    const isFile = isFieldFile(previous)
        || isFieldFile(current)

    if (!isFile) {
        return handleItemAsObject({
            previous,
            current
        })
    }

    return handleItemAsFile({
        previous,
        current
    })


}

const handleArray = async ({ previous, current }) => {
    const objects = missingObjectsBetweenArrays(previous, current)
    //TODO: objects === 0 when [files]
    if (!objects || !objects.length) {
        return
    }

    if (isFieldFile(objects[0])) {
        await Promise.all(objects.map(destroyItemAsFile))
    } else {
        await Promise.all(objects.map(destroyItemAsObject))
    }
}

const handleItemAsObject = async ({ previous, current }) => {
    const objects = missingObjectsBetweenArrays([previous], [current])
    //TODO: objects === 0 when [files]
    if (!objects || !objects.length) {
        return
    }

    await Promise.all(objects.map(destroyItemAsObject))
}

const handleItemAsFile = async ({ previous, current }) => {
    if (!previous) {
        return
    }

    if (!current) {
        return destroyItemAsFile(previous)
    }

    if (previous.name() !== current.name()) {
        return destroyItemAsFile(previous)
    }
}

const missingObjectsBetweenArrays = (a, b) => {
    if (!b || !b.length) {
        return a
    }

    if (!a || !a.length) {
        return []
    }

    let _a = a.filter(i => i)
    let _b = b.filter(i => i)

    const isFile = isFieldFile(_b[0])
    if (isFile) {
        return missingObjectsBetweenArraysFiles(_a, _b)
    }
    else {
        return missingObjectsBetweenArraysObject(_a, _b)
    }
}

const missingObjectsBetweenArraysFiles = (a, b) => {
    const bUrls = b.map(i => i.url())

    return a.map(i => {
        //TODO: handle files
        if (!bUrls.includes(i.url())) {
            return i
        }
        return null
    }).filter(a => a)
}

const missingObjectsBetweenArraysObject = (a, b) => {
    const bIds = b.map(i => i.id)

    return a.map(i => {
        //TODO: handle files
        if (!bIds.includes(i.id)) {
            return i
        }
        return null
    }).filter(a => a)
}

const isFieldFile = (item) => {

    if (!item) {
        return false
    }
    return (item._name && item._url)
}

const destroyItemAsObject = async i => {
    try {
        i.isDataAvailable && !i.isDataAvailable() && i.fetch && (await i.fetch({ useMasterKey: true })) // The check will skip files
        await i.destroy({ useMasterKey: true })
    } catch (e) {
        console.error('Feature > dependentChildren > destroyItem', e.message)
    }
}

const destroyItemAsFile = async i => {
    try {
        await i.destroy({ useMasterKey: true })
    } catch (e) {
        console.error('Feature > dependentChildren > destroyItem', e.message)
    }
}
