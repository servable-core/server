import manual from "./manual/index.js"
import auto from "./auto/index.js"

export default async ({ feature, operationProps, configuration }) => {

  const { mode } = feature

  switch (mode) {
    default:
    case 'manual': {
      await manual({ feature, operationProps })
    } break
    case 'auto': {
      await auto({ feature, configuration })
    } break
  }
}
