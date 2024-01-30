import parseServerStateWatcher from "../../../../utils/utilsDatabase/classes/parseServerState/functions/watch.js"
import staging from "./configurations/staging/index.js"
import production from "./configurations/production/index.js"


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

      switch (item.key) {
        case 'staging': {
          return staging({ ...props, item, data })
        }
        case 'production':
        default: {
          return production({ ...props, item, data })
        }
      }
    }
  })
}
