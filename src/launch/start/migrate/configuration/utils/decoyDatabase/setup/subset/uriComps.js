import { MongoClient } from 'mongodb'
import mongodbUri from 'mongodb-uri'

export default async (props) => {
  const {
    databaseURI
  } = props

  try {

    let data = mongodbUri.parse(databaseURI)
    let { database: databaseName } = data
    if (!databaseName) {
      return
    }
    delete data.database
    let clientURI = mongodbUri.format(data)

    const client = await MongoClient.connect(clientURI)
    // await client.connect()
    // const connection = client.db(database)

    const database = client.db(databaseName)
    return {
      clientURI,
      databaseURI,
      client,
      database
      // connection
    }
  } catch (e) {
    console.error(e)
  }
  return null
}




