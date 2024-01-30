import mongodbUri from 'mongodb-uri'

export default (props) => {
  const { sourceUri, targetDatabaseSuffix } = props
  let data = mongodbUri.parse(sourceUri)
  const sourceDatabase = data.database
  delete data.database
  const targetDatabase = `${sourceDatabase}_${targetDatabaseSuffix}`

  return mongodbUri.format({
    ...data,
    database: targetDatabase
  })
}