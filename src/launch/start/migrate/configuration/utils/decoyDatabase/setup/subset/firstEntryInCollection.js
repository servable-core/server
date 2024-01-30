
export default async ({ collection }) => {
  const items = await collection.find().sort({ _created_at: 1 }).toArray()
  if (!items) {
    return null
  }
  return items[0]
}