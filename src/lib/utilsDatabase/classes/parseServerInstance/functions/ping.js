import getStateForConfiguration from "./getStateForConfiguration.js"

export default async (props) => {
  try {
    const item = await getStateForConfiguration(props)
    item.lastPing = Date.now()
    await item.save()
  } catch (e) {
    console.error(e)
  }
}
