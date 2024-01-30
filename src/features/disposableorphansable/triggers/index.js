import handleItem from "../lib/handleItem/index.js"
import _ from 'underscore'

export const afterDelete = async ({ request }) => {
  const { object } = request

  if (!object || !object.disposableOrphans) {
    return
  }

  let items = object.disposableOrphans()
  if (!items || !items.length) {
    return
  }
  items = _.uniq(items)

  await Promise.all(items.map(field => handleItem({ object, field })))
}
