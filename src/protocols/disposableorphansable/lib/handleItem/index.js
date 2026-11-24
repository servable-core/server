import destroyItemAsFile from './destroyItemAsFile.js'
import destroyItemAsObject from './destroyItemAsObject.js'
import isFieldFile from './isFieldFile.js'
import { recordTheOrphansHandled } from '../orphanSignals.js'

const NOTHING_HANDLED = Object.freeze({ destroyed: 0, failed: 0 })

const handledOf = (results) => ({
  destroyed: results.filter((isDestroyed) => isDestroyed === true).length,
  failed: results.filter((isDestroyed) => isDestroyed !== true).length,
})

// Destroys the rows (or files) `object` holds in `field`. Answers `{ destroyed, failed }`, also counted by parent class and field
// (../orphanSignals.js): one row that fails never stops the others.
const destroyTheOrphansOf = async ({ object, field }) => {
  if (!object || !field) {
    return NOTHING_HANDLED
  }

  let objects = object.get(field)

  if (!objects) {
    return NOTHING_HANDLED
  }

  // A Relation's rows are read with the master key, as they are destroyed: an afterDelete runs with no user, and the
  // related class's permissions let no anonymous read through, so the rows outlived the object (2026-11-24).
  if (objects.constructor && objects.constructor.name === 'ParseRelation') {
    const query = objects.query()
    const results = []
    await query.each(async a => {
      try {
        await a.destroy({ useMasterKey: true })
        results.push(true)
      } catch (e) {
        console.error('[disposableorphansable] destroy relation', e.message)
        results.push(false)
      }
    }, { useMasterKey: true })
    return handledOf(results)
  }

  if (!Array.isArray(objects)) {
    objects = [objects].filter(a => a)
  }

  if (!objects.length) {
    return NOTHING_HANDLED
  }

  if (isFieldFile(objects[0])) {
    return handledOf(await Promise.all(objects.map(destroyItemAsFile)))
  }

  return handledOf(await Promise.all(objects.map(destroyItemAsObject)))
}

export default async ({ object, field }) => {
  const handled = await destroyTheOrphansOf({ object, field })
  recordTheOrphansHandled({ className: object?.className, field, ...handled })
  return handled
}
