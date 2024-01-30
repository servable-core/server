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
