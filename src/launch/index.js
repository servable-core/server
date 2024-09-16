import ServableClass from "../domain/servable/index.js"
import seed from "./seed/index.js"
import liveServer from "./liveServer/index.js"
import registerClasses from "./registerClasses/index.js"
import wireSchema from "./wireSchema/index.js"
import afterInit from "./afterInit/index.js"
import beforeInit from "./beforeInit/index.js"
import start from "./start/index.js"
import adaptConfig from "../lib/adaptConfig/index.js"
import printEnd from './_messages/end.js'
import launchSystem from "./system/index.js"
import config from "./config/index.js"
import { buildSchema, validateSchema } from '@servable/tools'
// import { buildSchema, validateSchema } from '../../../tools/src/index.js'
// import mockDocumentation from "./mockDocumentation.js"
// import memwatch from 'node-memwatch-x'

/**
* @description
* @param {Object} object
* @param {Object} object.servableConfig -  Servable Config
* @param {Object} object.engine -  Servable engine to use
*/

export default async ({ servableConfig, engine }) => {
  // const heapDiff = new memwatch.HeapDiff()
  // Servable.Console.log("[Servable]", '[DEBUG]', `launch > entry`,)

  try {
    adaptConfig({
      servableConfig,
      engine
    })

    global.Servable = new ServableClass()


    // Servable.Console.log("[Servable]", '[DEBUG]', `Launch > Start`,)

    const app = await engine.createApp({ servableConfig })
    await global.Servable.hydrate({ servableConfig, engine, app })

    // Servable.Console.log("[Servable]", '[DEBUG]', `Launch > created an expres app`, Servable.Express.app)

    const staticSchema = await buildSchema({ servableConfig })
    console.info("[Servable]", staticSchema)
    const { isValid, issues, message } = await validateSchema({ schema: staticSchema })
    if (!isValid) {
      throw new Error(message)
    }

    console.info("[Servable]", "Schema is valid. Continuing.")

    // await mockDocumentation({ schema: staticSchema })
    await launchSystem({
      schema: staticSchema,
      servableConfig,
      engine
    })

    // Servable.Console.log("[Servable]", '[DEBUG]', `servableConfig`, servableConfig)


    const httpServer = await engine.createHttpServer({ app })
    Servable.httpServer = httpServer
    // Servable.Console.log("[Servable]", '[DEBUG]', `Launch > created a http server`)



    // Servable.Console.log("[Servable]", '[DEBUG]', `Launch > starting the parse server`)
    const serverStruct = await start({
      app,
      servableConfig,
      schema: staticSchema,
      engine
    })

    if (!serverStruct) {
      Servable.Console.log("[Servable]", '[DEBUG]', `Launch > failed creating the parse server`)
      return
    }

    // await mockDocumentation({ schema: _schema })

    // Servable.Console.log("[Servable]", `Launch > started the parse server`)

    const { schema, server, configuration } = serverStruct
    // Servable.Console.log('servableConfig', servableConfig, 'serverStruct', serverStruct,)
    // Servable.Console.log("[Servable]", 'protocols.length>>', schema.protocols.length,)
    // Servable.Console.log('protocols _schema', _schema.protocols.length, _schema.protocols)

    if (configuration.params.skipWiring) {
      Servable.Console.log("[Servable]", "Finished launching a configuration that doesnt require wiring")
      return
    }

    Servable.publicUrl = configuration.config.parse.publicServerURL
    Servable.Console.log("[Servable]", `Launch > set public server url (with mount)`, Servable.publicServerURL)
    /////////////////////////////

    await beforeInit({
      app,
      schema,
      configuration,
      server,
      servableConfig,
      engine
    })
    await registerClasses({
      schema
    })
    await liveServer({
      httpServer,
      engine
    })
    await wireSchema({
      schema,
      servableConfig
    })

    await seed({
      server,
      schema,
      app,
      httpServer,
      configuration,
      engine,
      operationProps: {
        server,
        schema,
        app,
        httpServer,
        configuration,
      }
    })
    await config({
      schema,
      configuration,
    })
    await afterInit({
      app,
      schema,
      configuration,
      server,
      servableConfig,
      engine
    })
    /////////////////////////////


    // const i = await Servable.Config.get('defaultLocale', { locale: "en_US" })
    // const a = await Servable.Config.get('defaultLocale', { locale: "en_US", object: null, protocol: { id: 'countryable' } })
    // Servable.Console.log("[Servable]", '--------Config:', i)
    printEnd()

    Servable.App.Route.define({
      method: "get",
      cache: {
        type: "inMemory",
        params: {
          window: 10
        }
      },
      rateLimiting: {
        type: "fixedByIp",
        params: {
          limit: 100,
          window: 1 * 1000,
          message: 'Too many requests'
        }
      },
      paths: ['/health-check', '/healthcheck'],
      handler: async () => "Health check passed"
    })
  } catch (e) {
    console.error('[SERVABLE]', 'launch', e)
    Servable.App.Route.define({
      method: "get",
      path: '/health-check',
      handler: async (_, response) => {
        response.status(500).send('Server failed')
      }
    })
  }
  finally {
    // const diff = heapDiff.end()
    // Servable.Console.log('[SERVABLE]', '[PERFORMANCE]', 'launch>heapdiff', diff)
  }
}
