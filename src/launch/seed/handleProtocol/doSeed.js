import manual from "./manual/index.js"
import auto from "./auto/index.js"

export default async ({ protocol, operationProps, stateStore }) => {

  const { mode } = protocol

  switch (mode) {
    default:
    case 'manual': {
      await manual({ protocol, operationProps })
    } break
    case 'auto': {
      await auto({ protocol, stateStore })
    } break
  }
}
