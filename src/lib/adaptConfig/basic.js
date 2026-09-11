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

  // Per-key defaulting, not "is the whole object missing" - a servableConfig that only sets
  // system.docker.namespace (see handleProtocol/index.js's own comment on why that field exists)
  // would otherwise silently lose enabled/environments entirely, since the old check treated any
  // caller-provided system.docker as "fully specified, nothing to default."
  if (!servableConfig.system.docker) {
    servableConfig.system.docker = {}
  }

  if (servableConfig.system.docker.enabled === undefined) {
    servableConfig.system.docker.enabled = true
  }

  if (!servableConfig.system.docker.environments) {
    servableConfig.system.docker.environments = ['development']
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
  servableConfig.envs["publicURI"] = envOr(process.env.SERVABLE_SERVER_PUBLIC_URI, servableConfig.envs["serverURL"])
  servableConfig.envs["appID"] = envOr(process.env.SERVABLE_APP_ID, "my-appid")
  servableConfig.envs["appName"] = envOr(process.env.SERVABLE_APP_NAME, "My app")
  servableConfig.envs["masterKey"] = envOr(process.env.SERVABLE_MASTER_KEY, "MASTER_KEY_TO_CHANGE")
  servableConfig.envs["verbose"] = envOr(process.env.SERVABLE_VERBOSE, 1)
  servableConfig.envs["logLevel"] = envOr(process.env.SERVABLE_LOG_LEVEL, "verbose")
  servableConfig.envs["redisCacheUri"] = process.env.SERVABLE_REDIS_CACHE_URI
  // Preserve, don't overwrite: adaptConfig() runs a second time (launch/index.js, `live: true`)
  // AFTER launchSystem() has already merged the dynamically-detected docker-compose connection
  // details (servableConfig.envs = {...servableConfig.envs, ...payload}, launch/system/index.js)
  // into servableConfig.envs - including the correct utilsDatabaseURI when docker had to
  // reassign the declared port (getPortNear, e.g. two worktrees' stacks running at once). An
  // unconditional assignment here silently clobbered that back to process.env.
  // SERVABLE_UTILS_DATABASE_URI (undefined when that env var is deliberately left unset to let
  // auto-detection handle it) on the second call, and Mongoose/the Mongo driver then fell back to
  // its own default localhost:27017 - a real, confirmed boot failure whenever the declared port
  // wasn't free. databaseURI (the main engine DB) never had this bug - its equivalent line in
  // parse-server-unischema's setConfigurations/fillEnv.js already used this same
  // preserve-if-already-set pattern.
  servableConfig.envs["utilsDatabaseURI"] = envOr(servableConfig.envs["utilsDatabaseURI"], process.env.SERVABLE_UTILS_DATABASE_URI)

  servableConfig.adaptedBasic = true
}
