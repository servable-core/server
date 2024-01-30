export default async ({ model, key }) => {
  const item = new model()
  item.key = key
  return item.save()
}
