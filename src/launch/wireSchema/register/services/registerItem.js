// @ts-nocheck - lucide (PEAKUB DX initiative): wireSchema's internal protocol->engine registration glue, not part of this package's public surface (only launch() is exported). Deferred rather than annotated - a future pass should type the handoff shapes between wireSchema and each register/* module properly.
import { reasonServiceIsNotRegistered } from './validate.js'

export default async ({
  service,
  protocol }) => {

  const reasonNotRegistered = reasonServiceIsNotRegistered({ service })
  if (reasonNotRegistered) {
    if (service && typeof service === 'object' && service.id) {
      console.info(`[SERVABLE] [services] ${service.id} is not registered: ${reasonNotRegistered}`)
    }
    return
  }

  Servable.Services.register({ service, protocol })
}
