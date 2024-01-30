export default async ({ model, type, entityId }) => {
  return model.findOne({ type, entityId }).exec()
}
