import { fileURLToPath } from "url"
import { dirname } from "path"
import envOr from "../../../../../lib/utils/envOr"
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  docker: {
    path: () => {
      return `${__dirname}/docker`
    },
    amendServices: async ({
      services,
      servableConfig,
    }) => {
      if (process.env.SERVABLE_REDIS_CACHE_URI) {
        delete services["servable-redis-cache"]
      }
    }
  },
  adaptAppPayload: async ({
    item,
    config,
    servableConfig,
    schema }) => {

    if (!config || !config.services) {
      return {}
    }

    const redisCacheService = config.services['servable-redis-cache']
    let configSERVABLE_REDIS_CACHE_URI
    if (redisCacheService) {
      configSERVABLE_REDIS_CACHE_URI = redisCacheService.environment.REDIS_PASSWORD ?
        `redis://:${redisCacheService.environment.REDIS_PASSWORD}@localhost:${redisCacheService.ports[0].published}`
        : `redis://localhost:${redisCacheService.ports[0].published}`
    }

    return {
      // utilsDatabaseURI: envOr(process.env.SERVABLE_UTILS_DATABASE_URI, configSERVABLE_UTILS_DATABASE_URI),
      redisCacheUri: envOr(process.env.SERVABLE_REDIS_CACHE_URI, configSERVABLE_REDIS_CACHE_URI),
    }
  }
}
