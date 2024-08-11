import registerItem from "./registerItem.js"

export default async ({
  files,
  prefix,
  servableConfig,
  protocol
}) => {

  if (!files) {
    return
  }

  await Promise.all(files.map(async file => {
    const route = file.default
    return registerItem({
      route,
      prefix,
      servableConfig,
      protocol
    })
  }))
}
