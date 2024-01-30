import registerCloudCode from './cloudCode/index.js'
import registerRoutes from './routes/index.js'
import registerJobs from './jobs/index.js'
import registerClasses from "./classes/index.js"
import registerServices from "./services/index.js"

export default async ({
  feature,
  servableConfig
}) => {

  const prefix = feature.id === 'app' ? null : feature.id

  const functions = await feature.loader.functions()
  await registerCloudCode({ files: functions, prefix })

  const routes = await feature.loader.routes()
  await registerRoutes({ files: routes, prefix, servableConfig, feature })

  const jobs = await feature.loader.jobFiles()
  await registerJobs({ files: jobs, prefix })

  const services = await feature.loader.services()
  await registerServices({ files: services, feature })

  //#TODO: feature.schema
  const { classes: { managed: managedClasses }, } = feature.schema
  await registerClasses({
    servableConfig,
    feature,
    managedClasses,
  })
}
