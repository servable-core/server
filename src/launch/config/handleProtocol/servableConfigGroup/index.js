import get from "./crud/get.js"
import { sha256, } from 'js-sha256'
import update from "./crud/update.js"
import create from "./crud/create.js"

export default async (props) => {
  const {
    item,
    servableConfig
  } = props

  const sourceSHA = sha256(JSON.stringify(item))

  let object = await get({ item, servableConfig })
  if (object) {
    if (object.get('manualableSourceSHA') === sourceSHA) {
      return object
    }

    if (object.get('manualableMode') === 'manual') {
      return object
    }

    await update({ object, item, servableConfig })
  }
  else {
    object = await create({ item, servableConfig })
  }

  object.set('manualableSourceData', item)
  object.set('manualableSourceSHA', sourceSHA)
  object.set('uniqueRef', item.key)
  const context = { manualableMode: 'auto' }

  return object.save(null, { useMasterKey: true, ...context })
}


