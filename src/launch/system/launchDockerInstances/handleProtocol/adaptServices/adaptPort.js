import getPortNear from "../../../../utils/ports/getPortNear.js"

export default async (props) => {
  const {
    port,
    protocol,
  } = props

  const { mode, published, target } = port

  try {
    const publishedInt = parseInt(published)
    const _published = await getPortNear({
      port: publishedInt,
      maxRange: 1000
    })
    return {
      ...port,
      published: _published
    }
  } catch (e) {
    console.error(e)
  }
  return port
}
