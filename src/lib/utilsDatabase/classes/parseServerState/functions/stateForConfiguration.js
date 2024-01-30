import get from "../crud/get.js"
import create from "../crud/create.js"
import prepareModel from "./prepareModel.js"

export default async (props) => {
  const { configuration } = props
  const { key } = configuration

  const model = await prepareModel(props)

  let item = await get({ model, key })
  if (!item) {
    item = await create({ model, key })
  }

  if (!item) {
    throw new Error('Could not connect to util database')
  }

  return item
}
