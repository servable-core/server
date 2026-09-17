// @ts-nocheck - lucide (PEAKUB DX initiative): wireSchema's internal protocol->engine registration glue, not part of this package's public surface (only launch() is exported). Deferred rather than annotated - a future pass should type the handoff shapes between wireSchema and each register/* module properly.
import validate from './validate.js'

export default async ({
  service,
  protocol }) => {

  if (!validate({ service })) {
    return
  }

  Servable.Services.register({ service, protocol })
}
