import path from 'path'

export default (props) => {
    const {
        volume,
        protocol,
    } = props

    const { source, type } = volume
    // return volume
    try {
        const pp = protocol.loader.systemDockerComposeDirPath()
        const subPart = source.split(pp)
        // let newSource = path.resolve('', `.system/${protocol.id}/docker/data/${subPart[1]}`)
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
