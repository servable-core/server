import generateSourcesFromUri from "../generateSourcesFromUri.js"

export default async (props) => {
  const { configuration } = props
  const targetDatabaseSuffix = configuration.key
  const sourceUri = configuration.config.parse.databaseURI
  const databaseURI = generateSourcesFromUri({ sourceUri, targetDatabaseSuffix })

  const _configuration = {
    ...configuration,
    config: {
      ...configuration.config,
      parse: {
        ...configuration.config.parse,
        sourceDatabaseURI: configuration.config.parse.databaseURI,
        databaseURI
      }
    }
  }

  return _configuration
}
