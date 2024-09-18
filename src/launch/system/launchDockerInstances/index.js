import handleProtocol from "./handleProtocol/index.js"
import canStart from "./canStart.js"

export default async ({ schema, servableConfig, engine }) => {

  const {
    protocols,
  } = schema

  if (!servableConfig.system.docker.environments.includes(process.env.NODE_ENV)) {
    return null
  }

  if (!(await canStart())) {
    console.warn(`Can't launch docker engines.`)
    return
  }

  const items = []

  for (const protocol of protocols) {
    const item = await handleProtocol({
      servableConfig,
      protocol,
      engine

    })
    items.push(item)
  }

  return items.filter(a => a)
}
