import client from "../../../db/client.js"
import schema from "../schema/index.js"
import mongoose from 'mongoose'
mongoose.set('strictQuery', true)

export default async (props) => {
  const { configuration } = props
  const { lock, key } = configuration
  //#TODO: remove databaseURI from lock
  const { databaseURI, } = lock

  if (!databaseURI) {
    throw new Error('Could not connect : no utilsDatabaseURI')
  }

  const db = await client({ databaseURI })
  if (!db) {
    throw new Error('Could not connect to util database')
  }

  const model = mongoose.model('ConfigState', schema)

  return model
}
