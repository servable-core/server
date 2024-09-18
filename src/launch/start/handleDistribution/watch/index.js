import parseServerStateWatcher from "../../../../utils/utilsDatabase/classes/parseServerState/functions/watch.js"
import doWatch from "./doWatch.js"

export default async (props) => {
  const { configuration: { key } } = props
  parseServerStateWatcher({
    ...props, onChange: async ({ item, data }) => {
      if (!item) {
        return null //#TODO
      }

      if (item.key !== key) {
        return
      }
      return doWatch({ ...props, item, data })
    }
  })
}
