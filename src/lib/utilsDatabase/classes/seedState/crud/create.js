export default async ({ model, entityId, type }) => {
  const item = new model()
  item.entityId = entityId
  item.type = type
  return item.save()
}
