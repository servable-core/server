import schema from "../schema/index.js"
import mongoose from 'mongoose'
// import get from "../crud/get"

export default async (props) => {
  const { onShouldQuit, } = props
  const model = mongoose.model('ParseServerState', schema)
  model.watch().on('change', async data => {
    //   console.log("[Servable]", 'ParseServerState changed:', data)
    //   let item = await get({ model })
    //   if (!item) {
    //     return
    //   }
    //   const state = item.migrationState
    //   switch (state) {
    //     case 3:
    //     case 2: {

    //     } break
    //     default: {
    //       onShouldQuit()
    //     } break
    //   }
  })
}
