import path from 'path'
// import callerPath from 'caller-path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import envOr from '../utils/envOr.js'
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

  if (!servableConfig.dryRun) {
    servableConfig.dryRun = {
      enabled: false,
    }
  }

  if (servableConfig.dryRun.enabled) {
    const { environments = [] } = servableConfig.dryRun
    const currentEnv = process.env.NODE_ENV
    if (!environments.includes(currentEnv)) {
      servableConfig.dryRun = {
        enabled: false,
      }
    }
  }

  servableConfig.dryRun.matches = ({ userStruct, role }) => {
    if (!servableConfig.dryRun.enabled) {
      return true
    }

    if (!userStruct) {
      return false
    }

    const { email, phoneNumber, user } = userStruct
    const userId = userStruct.userId ? userStruct.userId : (user ? user.id : null)
    const { exceptions } = servableConfig.dryRun
    if (!exceptions || !exceptions.users) {
      return false
    }

    const candidate = exceptions.users.find(a => {
      return (a.email && email)
        || (a.id && userId)
        || (a.phoneNumber && phoneNumber)
    })
    return candidate
  }

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

  if (!servableConfig.protocols) {
    servableConfig.protocols = {}
  }

  if (!servableConfig.protocols.local
    || !servableConfig.protocols.local.length) {
    servableConfig.protocols.local = [
      path.resolve('', 'protocols')
    ]
  }

  servableConfig.protocols.local = [
    path.resolve(__dirname, `../../protocols`),
    ...servableConfig.protocols.local,
  ]

  if (!servableConfig.rootProtocolPayload) {
    servableConfig.rootProtocolPayload = {
      type: 'app',
      id: 'app',
      // path: path.resolve(__dirname, "./app")
      path: path.resolve('', 'app')
    }
  }

  if (!servableConfig.rootProtocolPayload.path) {
    servableConfig.rootProtocolPayload = {
      ...servableConfig.rootProtocolPayload,
      path: path.resolve('', 'app')
      // path: path.resolve(__dirname, "./app")
    }
  }

  if (!servableConfig.rootProtocolPayload.id || !servableConfig.rootProtocolPayload.type) {
    servableConfig.rootProtocolPayload = {
      ...servableConfig.rootProtocolPayload,
      id: 'app',
      type: 'app',
    }
  }

  servableConfig.envs = servableConfig.envs ? servableConfig.envs : {}

  servableConfig.envs["serverPort"] = envOr(process.env.SERVABLE_SERVER_PORT, 1337)
  servableConfig.envs["serverHost"] = envOr(process.env.SERVABLE_SERVER_HOST, "http://localhost")
  servableConfig.envs["serverURL"] = `${servableConfig.envs["serverHost"]}:${servableConfig.envs["serverPort"]}`
  servableConfig.envs["publicURI"] = envOr(process.env.SERVABLE_SERVER_PUBLIC_URI, "http://localhost")
  servableConfig.envs["appID"] = envOr(process.env.SERVABLE_APP_ID, "my-appid")
  servableConfig.envs["appName"] = envOr(process.env.SERVABLE_APP_NAME, "My app")
  servableConfig.envs["masterKey"] = envOr(process.env.SERVABLE_MASTER_KEY, "MASTER_KEY_TO_CHANGE")
  servableConfig.envs["verbose"] = envOr(process.env.SERVABLE_VERBOSE, 1)
  servableConfig.envs["logLevel"] = envOr(process.env.SERVABLE_LOG_LEVEL, "verbose")
  servableConfig.envs["redisCacheUri"] = process.env.SERVABLE_REDIS_CACHE_URI
  servableConfig.envs["utilsDatabaseURI"] = process.env.SERVABLE_UTILS_DATABASE_URI

  servableConfig.adaptedBasic = true
}
