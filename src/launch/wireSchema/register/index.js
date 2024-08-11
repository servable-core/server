import registerCloudCode from './cloudCode/index.js'
import registerRoutes from './routes/index.js'
import registerJobs from './jobs/index.js'
import registerClasses from "./classes/index.js"
import registerServices from "./services/index.js"
import registerLiveQueries from "./livequeries/index.js"

export default async ({
  protocol,
  servableConfig,
  allProtocols
}) => {

  const prefix = protocol._id === 'app' ? null : protocol._id

  const functions = await protocol.loader.functions()
  await registerCloudCode({
    files: functions,
    prefix
  })

  const routes = await protocol.loader.routes()
  if (routes) {
    const keys = Object.keys(routes)
    if (keys.length) {
      for (const key of keys) {
        const items = routes[key]
        if (!items || !items.length) {
          continue
        }

        await registerRoutes({
          files: items,
          prefix: key,
          servableConfig,
          protocol
        })
      }
    }
  }


  const jobs = await protocol.loader.jobFiles()
  await registerJobs({
    files: jobs,
    prefix
  })

  const services = await protocol.loader.services()
  await registerServices({
    files: services,
    protocol
  })

  const liveQueries = await protocol.loader.liveQueries()
  await registerLiveQueries({
    files: liveQueries,
    protocol
  })

  //#TODO: protocol.schema
  const { classes: { managed: managedClasses }, } = protocol.schema
  await registerClasses({
    servableConfig,
    protocol,
    allProtocols,
    managedClasses,
  })
}
