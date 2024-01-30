import envOr from "../utils/envOr.js"


export default async ({
  item,
  config,
  servableConfig,
  schema }) => {

  if (!config || !config.services) {
    return null
  }

  const mongoService = config.services['app-mongo']
  const configSERVABLE_DATABASE_URI = mongoService ?
    `mongodb://${mongoService.environment.MONGO_INITDB_ROOT_USERNAME}:${mongoService.environment.MONGO_INITDB_ROOT_PASSWORD}@localhost:${mongoService.ports[0].published}/${mongoService.environment.MONGO_INITDB_DATABASE}?authSource=admin&readPreference=primary&ssl=false`
    : ''

  const configSERVABLE_UTILS_DATABASE_URI = mongoService ?
    `mongodb://${mongoService.environment.MONGO_INITDB_ROOT_USERNAME}:${mongoService.environment.MONGO_INITDB_ROOT_PASSWORD}@localhost:${mongoService.ports[0].published}/utils?authSource=admin&readPreference=primary&ssl=false`
    : ''

  const storageService = config.services['minio']
  const configSERVABLE_OBJECTSTORAGE_ENDPOINT = `http://localhost:${storageService.ports[0].published}`

  const redisCacheService = config.services['redis-cache']
  const configSERVABLE_REDIS_CACHE_URI = `redis://:${redisCacheService.environment.REDIS_PASSWORD}@localhost:${redisCacheService.ports[0].published}`

  const liveQueryService = config.services['liveserver-redis-cache']
  const configSERVABLE_REDIS_LIVESERVER_DB_URI = `redis://:${liveQueryService.environment.REDIS_PASSWORD}@localhost:${liveQueryService.ports[0].published}`

  const payload = {
    databaseURI: envOr(process.env.SERVABLE_DATABASE_URI, configSERVABLE_DATABASE_URI),
    utilsDatabaseURI: envOr(process.env.SERVABLE_UTILS_DATABASE_URI, configSERVABLE_UTILS_DATABASE_URI),
    filesAdapterEndPoint: envOr(process.env.SERVABLE_OBJECTSTORAGE_ENDPOINT, configSERVABLE_OBJECTSTORAGE_ENDPOINT),
    redisCacheUri: envOr(process.env.SERVABLE_REDIS_CACHE_URI, configSERVABLE_REDIS_CACHE_URI),
    liveQueryServiceUri: envOr(process.env.SERVABLE_REDIS_LIVESERVER_DB_URI, configSERVABLE_REDIS_LIVESERVER_DB_URI),
  }

  return payload
}
