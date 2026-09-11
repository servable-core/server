export default async ({ model, key }) => {
  return model.findOne({ key }).exec()
}
