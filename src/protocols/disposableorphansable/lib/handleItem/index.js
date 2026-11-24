import destroyItemAsFile from './destroyItemAsFile.js'
import destroyItemAsObject from './destroyItemAsObject.js'
import isFieldFile from './isFieldFile.js'

export default async ({ object, field }) => {
  if (!object || !field) {
    return
  }

  let objects = object.get(field)

  if (!objects) {
    return
  }

  // A Relation's rows are read with the master key, as they are destroyed: an afterDelete runs with no user, and the
  // related class's permissions let no anonymous read through, so the rows outlived the object (2026-11-24).
  if (objects.constructor && objects.constructor.name === 'ParseRelation') {
    const query = objects.query()
    await query.each(async a => {
      try {
        await a.destroy({ useMasterKey: true })
      } catch (e) {
        console.error('[disposableorphansable] destroy relation', e.message)
      }
    }, { useMasterKey: true })
    return
  }

  if (!Array.isArray(objects)) {
    objects = [objects].filter(a => a)
  }

  if (!objects.length) {
    return
  }

  if (isFieldFile(objects[0])) {
    return Promise.all(objects.map(destroyItemAsFile))
  }

  return Promise.all(objects.map(destroyItemAsObject))
}
