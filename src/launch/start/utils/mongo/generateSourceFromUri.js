import mongodbUri from 'mongodb-uri'

export default (databaseUri) => {
  let data = mongodbUri.parse(databaseUri)

  const dbname = data.database
  delete data.database

  const uri = mongodbUri.format(data)
  const connection = {
    uri,
    dbname
  }

  return connection
}