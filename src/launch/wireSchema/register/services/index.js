// @ts-nocheck - lucide (PEAKUB DX initiative): wireSchema's internal protocol->engine registration glue, not part of this package's public surface (only launch() is exported). Deferred rather than annotated - a future pass should type the handoff shapes between wireSchema and each register/* module properly.
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
