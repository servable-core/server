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
    const liveQuery = file.default
    return registerItem({
      liveQuery,
      servableConfig,
      protocol
    })
  }))
}
