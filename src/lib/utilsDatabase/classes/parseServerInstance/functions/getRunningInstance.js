import prepareModel from "./prepareModel.js"

export default async (props) => {
  const { configuration } = props
  const { key } = configuration

  const model = await prepareModel(props)

  let item = await model.findOne({
    key,
    lastPing: {
      $lt: Date.now(),
      $gt: (Date.now() - (5 * 1000 * 2))
    }
  }).exec()


  let _item = await model.findOne({
    key,
    lastPing: {
      $lt: Date.now(),
      $gt: (Date.now() - (5 * 1000 * 60 * 60 * 4))
    }
  }).exec()

  return item
}
