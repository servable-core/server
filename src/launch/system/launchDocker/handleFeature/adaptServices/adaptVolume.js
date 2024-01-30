import path from 'path'

export default (props) => {
    const {
        volume,
        feature,
    } = props

    const { source, type } = volume
    // return volume
    try {
        const pp = feature.loader.systemDockerComposeDirPath()
        const subPart = source.split(pp)
        // let newSource = path.resolve('', `.system/${feature.id}/docker/data/${subPart[1]}`)
        let newSource = `./data/${subPart[1]}`
        newSource = path.normalize(newSource)
        return {
            ...volume,
            source: newSource
        }
    } catch (e) {
        console.error(e)
        throw (e)
    }
}
