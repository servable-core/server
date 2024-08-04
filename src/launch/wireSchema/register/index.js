import registerCloudCode from './cloudCode/index.js'
import registerRoutes from './routes/index.js'
import registerJobs from './jobs/index.js'
import registerClasses from "./classes/index.js"
import registerServices from "./services/index.js"
import registerLiveQueries from "./livequeries/index.js"

export default async ({
  feature,
  servableConfig,
  allFeatures
}) => {

  const prefix = feature._id === 'app' ? null : feature._id

  const functions = await feature.loader.functions()
  await registerCloudCode({
    files: functions,
    prefix
  })

  const routes = await feature.loader.routes()
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
          feature
        })
      }
    }
  }


  const jobs = await feature.loader.jobFiles()
  await registerJobs({
    files: jobs,
    prefix
  })

  const services = await feature.loader.services()
  await registerServices({
    files: services,
    feature
  })

  const liveQueries = await feature.loader.liveQueries()
  await registerLiveQueries({
    files: liveQueries,
    feature
  })

  //#TODO: feature.schema
  const { classes: { managed: managedClasses }, } = feature.schema
  await registerClasses({
    servableConfig,
    feature,
    allFeatures,
    managedClasses,
  })
}
