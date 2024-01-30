export default async ({ model, id }) => {
  return model.findOne({ _id: id }).exec()
}
