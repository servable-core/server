import { MongoClient } from 'mongodb'
import mongodbUri from 'mongodb-uri'

export default async (props) => {
  const {
    configuration
  } = props

  try {
    const { config: { parse: { databaseURI } } } = configuration

    let data = mongodbUri.parse(databaseURI)
    let { database } = data
    if (!database) {
      return
    }
    delete data.database
    let uri = mongodbUri.format(data)

    const client = await MongoClient.connect(uri)
    const connection = client.db(database)
    if (!connection) {
      return
    }

    await connection.dropDatabase()
  } catch (e) {
    console.error(e)
  }
}




