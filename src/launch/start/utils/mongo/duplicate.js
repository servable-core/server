import { MongoTransferer, MongoDBDuplexConnector } from 'mongodb-snapshot'
import generateSourceFromUri from './generateSourceFromUri.js'

export default async (props) => {
  const { sourceUri, targetUri, progress } = props
  const sourceConnection = generateSourceFromUri(sourceUri)
  const targetConnection = generateSourceFromUri(targetUri)


  try {
    const source = new MongoDBDuplexConnector({
      connection: sourceConnection
    })

    const target = new MongoDBDuplexConnector({
      connection: targetConnection
    })

    const transferer = new MongoTransferer({
      source,
      targets: [target],
    })
    console.time('copyDB')
    for await (const { total, write } of transferer) {
      console.log("[Servable]", `remaining bytes to write: ${total - write}`)
      progress && progress({ total, write })
    }
    console.timeEnd('copyDB')
    return {
      source,
      target,
    }
  }
  catch (e) {
    console.error(e)
    return null
  }
}
