export default ({ configuration, config, }) => {
    return {
        ...config,
        parse: {
            ...config.parse,
            databaseURI: configuration.config.parse.databaseURI,
            mountPath: configuration.config.parse.mountPath,
            serverURL: configuration.config.parse.serverURL,
            publicServerURL: configuration.config.parse.publicServerURL,
            appId: configuration.config.parse.appId
        }
    }
}