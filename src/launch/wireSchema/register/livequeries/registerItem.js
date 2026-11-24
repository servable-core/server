import { reasonLiveQueryIsNotRegistered } from './validate.js'

export default async ({
  liveQuery,
  protocol }) => {

  const reasonNotRegistered = reasonLiveQueryIsNotRegistered({ liveQuery })
  if (reasonNotRegistered) {
    if (liveQuery && typeof liveQuery === 'object' && liveQuery.id) {
      console.info(`[SERVABLE] [live queries] ${liveQuery.id} is not registered: ${reasonNotRegistered}`)
    }
    return
  }

  await Servable.LiveQueries.register({ liveQuery, protocol })
}
