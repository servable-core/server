import client from '../../../db/client.js'
import schema from '../schema/index.js'
import mongoose from 'mongoose'

export default async ({ databaseURI }) => {
  if (!databaseURI) {
    throw new Error('Could not connect : no utilsDatabaseURI')
  }

  const db = await client({ databaseURI })
  if (!db) {
    throw new Error('Could not connect to util database')
  }

  return mongoose.model('ServableSchemaState', schema)
}
