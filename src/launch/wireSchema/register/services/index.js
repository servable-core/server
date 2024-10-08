import registerItem from './registerItem.js'

export default async ({
  files,
  servableConfig,
  protocol
}) => {

  if (!files || !files.length) {
    return
  }

  await Promise.all(files.map(async file => {
    const service = file.default
    return registerItem({
      service,
      servableConfig,
      protocol
    })
  }))
}
