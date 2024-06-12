import registerTriggers from './registerTriggers/index.js'
import registerCloudCode from '../cloudCode/index.js'
import registerJobs from '../jobs/index.js'

export default async ({
  managedClasses,
  feature,
  allFeatures,
  servableConfig,
}) => {


  return Promise.all(managedClasses.map(async _class => {
    return Promise.all(feature.instances.map(async featureInstance => {
      await registerTriggers({
        feature,
        featureInstance,
        servableConfig,
        allFeatures,
        _class
      })

      const { className } = _class

      const prefix = feature.id === 'app'
        ? null
        // : `${feature.id}${capitalizeFirstLetter(className)}`
        : `${feature.id}`

      const functions = await feature.loader.classFunctions({ className })
      await registerCloudCode({ files: functions, prefix })

      const jobFiles = await feature.loader.classJobs({ className })
      await registerJobs({ files: jobFiles, prefix })
    }))
  }))
}
