import registerTriggers from './registerTriggers/index.js'
import registerCloudCode from '../cloudCode/index.js'
import registerJobs from '../jobs/index.js'

export default async ({
  managedClasses,
  protocol,
  allProtocols,
  servableConfig,
}) => {

  return Promise.all(managedClasses.map(async _class => {
    await registerTriggers({
      protocol,
      servableConfig,
      allProtocols,
      _class
    })

    const { className } = _class

    const prefix = protocol.id === 'app'
      ? null
      // : `${protocol.id}${capitalizeFirstLetter(className)}`
      : `${protocol.id}`

    const functions = await protocol.loader.classFunctions({ className })
    await registerCloudCode({ files: functions, prefix })

    const jobFiles = await protocol.loader.classJobs({ className })
    await registerJobs({ files: jobFiles, prefix })
  }))
}
