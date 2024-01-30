import moment from 'moment'
import firstEntryInCollection from './firstEntryInCollection.js'

export default async ({
  sourceComps,
  targetComps,
  collectionInfo,
  maxItemsPerCollection = 1000,
  maxDurationInHours = 24 * 7 }) => {

  const {
    name,
  } = collectionInfo
  const collection = sourceComps.database.collection(name)

  const targetCollection = targetComps.database.collection(name)
  if (!targetCollection) {
    return null
  }

  const first = await firstEntryInCollection({ collection })
  if (!first) {
    await targetCollection.insertOne({ _id: 1 })
    await targetCollection.deleteOne({ _id: 1 })
    return null
  }

  const dateStart = first._created_at
  const dateEnd = moment(dateStart).add(maxDurationInHours, 'hours').toDate()
  // const dateEnd = moment().toDate()
  // const dateStart = (moment().add(-100, 'days')).toDate()

  let items = await collection.find(
    {
      _created_at: {
        $lte: dateEnd,
        $gte: dateStart
      }
    }
  )
    .sort({ _created_at: 1 })
    .limit(maxItemsPerCollection)
    .toArray()

  if (!items || !items.length) {
    items = await collection.find()
      .limit(maxItemsPerCollection)
      .toArray()

    if (!items || !items.length) {
      await targetCollection.insertOne({ _id: 1 })
      await targetCollection.deleteOne({ _id: 1 })
      return null
    }
  }

  const result = await targetCollection.insertMany(items)
  return result
}
