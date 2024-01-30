
export default async (props) => {
    Servable.Config.get = async (key, options = {}) => {
        if (!key) {
            return null
        }

        return Servable.App.Cloud.run('servableconfigurableGet',
            {
                key,
                options
            })
    }
}