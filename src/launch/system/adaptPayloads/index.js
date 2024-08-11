import handleProtocol from "./handleProtocol/index.js"

export default async (props) => {
  const { schema, servableConfig } = props
  const {
    protocols,
    appProtocol,
  } = schema

  const items = await Promise.all(protocols.map(async item => {
    return handleProtocol({
      ...props,
      item,
      allProtocols: protocols,
      appProtocol
    })
  }))
}
