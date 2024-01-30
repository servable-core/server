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
// import { buildSchema, validateSchema } from '../../../manifest/src/index.js'
// import mockDocumentation from "./mockDocumentation.js"
// import memwatch from 'node-memwatch-x'

export default async props => {
  // const heapDiff = new memwatch.HeapDiff()
  console.log("[Servable]", '[DEBUG]', `launch > entry`,)

  try {

    const { servableConfig, adapter: frameworkBridge } = props
    adaptConfig({ servableConfig, frameworkBridge })

    global.Servable = new ServableClass()


    // console.log("[Servable]", '[DEBUG]', `Launch > Start`,)

    const app = await frameworkBridge.createApp({ servableConfig })
    await global.Servable.hydrate({ servableConfig, frameworkBridge, app })
    // Servable.Express.app = app
    // console.log("[Servable]", '[DEBUG]', `Launch > created an expres app`, Servable.Express.app)

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
      frameworkBridge
    })

    // console.log("[Servable]", '[DEBUG]', `servableConfig`, servableConfig)


    const httpServer = await frameworkBridge.createHttpServer({ app })
    Servable.httpServer = httpServer
    // console.log("[Servable]", '[DEBUG]', `Launch > created a http server`)



    // console.log("[Servable]", '[DEBUG]', `Launch > starting the parse server`)
    const serverStruct = await start({ app, servableConfig, schema: staticSchema, frameworkBridge })
    if (!serverStruct) {
      console.log("[Servable]", '[DEBUG]', `Launch > failed creating the parse server`)
      return
    }

    // await mockDocumentation({ schema: _schema })

    // console.log("[Servable]", `Launch > started the parse server`)


    const { schema, server, configuration } = serverStruct
    // console.log('servableConfig', servableConfig, 'serverStruct', serverStruct,)
    // console.log("[Servable]", 'features.length>>', schema.features.length,)
    // console.log('features _schema', _schema.features.length, _schema.features)

    if (configuration.params.skipWiring) {
      console.log("[Servable]", "Finished launching a configuration that doesnt require wiring")
      return
    }

    Servable.publicUrl = configuration.config.parse.publicServerURL
    console.log("[Servable]", `Launch > set public server url (with mount)`, Servable.publicServerURL)
    /////////////////////////////

    await beforeInit({
      app,
      schema,
      configuration,
      server,
      servableConfig,
      frameworkBridge
    })
    await registerClasses({
      schema
    })
    await wireSchema({
      schema,
      servableConfig
    })
    await liveServer({
      httpServer,
      frameworkBridge
    })
    await seed({
      server,
      schema,
      app,
      httpServer,
      configuration,
      frameworkBridge,
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
      frameworkBridge
    })
    /////////////////////////////


    // const i = await Servable.Config.get('defaultLocale', { locale: "en_US" })
    // const a = await Servable.Config.get('defaultLocale', { locale: "en_US", object: null, feature: { id: 'countryable' } })
    // console.log("[Servable]", '--------Config:', i)
    printEnd()

    Servable.App.Route.define({
      method: Servable.App.Route.Constants.Methods.GET,
      paths: ['/health-check', '/healthcheck'],
      handler: async () => "Health check passed"
    })
  } catch (e) {
    console.error('[SERVABLE]', 'launch', e)
    Servable.App.Route.define({
      method: Servable.App.Route.Constants.Methods.GET,
      path: '/health-check',
      handler: async (_, response) => {
        response.status(500).send('Server failed')
      }
    })
  }
  finally {
    // const diff = heapDiff.end()
    // console.log('[SERVABLE]', '[PERFORMANCE]', 'launch>heapdiff', diff)
  }
}
