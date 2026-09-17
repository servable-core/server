// @ts-nocheck - lucide (PEAKUB DX initiative): local-dev docker-compose orchestration internals, not part of this package's public surface (only launch() is exported). Deferred rather than annotated - a future pass should type the config/protocol handoff shapes here properly.
import getPortNear from "../../../../utils/ports/getPortNear.js"

export default async (props) => {
  const {
    port,
    protocol,
  } = props

  const { mode, published, target } = port

  // A bare `- :27017` compose entry (no host port declared) means "let Docker pick a random free
  // host port itself" - `docker-compose config` then omits `published` entirely rather than
  // returning it as 0/empty. parseInt(undefined) is NaN, which previously reached getPortNear ->
  // get-port's portNumbers(NaN, NaN) and threw "`from` and `to` must be integer numbers",
  // aborting the whole port-adaptation pass for every service. There's nothing to reassign here -
  // Docker already avoids collisions on its own for these - so just leave the port as declared.
  if (published === undefined || published === null || published === '') {
    return port
  }

  try {
    const publishedInt = parseInt(published)
    const _published = await getPortNear({
      port: publishedInt,
      maxRange: 1000
    })
    return {
      ...port,
      published: _published,
      requestedPublished: publishedInt
    }
  } catch (e) {
    console.error(e)
  }
  return port
}
