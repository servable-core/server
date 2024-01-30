
import path from 'path'
// import callerPath from 'caller-path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)


export default ({ servableConfig }) => {
  if (servableConfig.adaptedBasic) {
    return
  }
  // const __filename = callerPath({ depth: 1 })
  // let __dirname = dirname(__filename)
  // __dirname = __dirname.split('file://')[1]

  // if (!servableConfig.nodeModulesPath) {
  //     servableConfig.nodeModulesPath = path.resolve(__dirname, `../node_modules`)
  // }

  if (!servableConfig.distribution) {
    servableConfig.distribution = {
      enabled: false,
    }
  }

  if (!servableConfig.distribution.databaseURI) {
    servableConfig.distribution.databaseURI = process.env.SERVABLE_UTILS_DATABASE_URI
  }


  if (!servableConfig.system) {
    servableConfig.system = {}
  }

  if (!servableConfig.system.docker) {
    servableConfig.system.docker = {
      enabled: true,
      environments: ['development']
    }
  }

  if (!servableConfig.features) {
    servableConfig.features = {}
  }

  if (!servableConfig.features.local || !servableConfig.features.local.length) {
    servableConfig.features.local = [
      path.resolve('', 'features')
    ]
  }

  servableConfig.features.local = [
    path.resolve(__dirname, `../../features`),
    ...servableConfig.features.local,
  ]

  if (!servableConfig.rootFeaturePayload) {
    servableConfig.rootFeaturePayload = {
      type: 'app',
      id: 'app',
      // path: path.resolve(__dirname, "./app")
      path: path.resolve('', 'app')
    }
  }

  if (!servableConfig.rootFeaturePayload.path) {
    servableConfig.rootFeaturePayload = {
      ...servableConfig.rootFeaturePayload,
      path: path.resolve('', 'app')
      // path: path.resolve(__dirname, "./app")
    }
  }

  if (!servableConfig.rootFeaturePayload.id || !servableConfig.rootFeaturePayload.type) {
    servableConfig.rootFeaturePayload = {
      ...servableConfig.rootFeaturePayload,
      id: 'app',
      type: 'app',
    }
  }

  servableConfig.adaptedBasic = true
}
