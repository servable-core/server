import path from 'path'
import ejs from 'ejs'


export default async (props) => {
  const {
    variableKey,
    variableValue,
    protocol,
    servableConfig
  } = props
  if (!variableValue) {
    return variableValue
  }

  return ejs.render(variableValue, servableConfig.envs, {
    async: true,
    strict: false
  })


  const { source, type } = volume
  // return volume
  try {
    const systemDockerComposeDirPath = protocol.loader.systemDockerComposeDirPath()
    const subPart = source.split(systemDockerComposeDirPath)
    // let newSource = path.resolve('', `.system/${protocol.id}/docker/data/${subPart[1]}`)
    let ext = subPart[1]
    if (!ext) {
      ext = `${key}`
    }

    let newSource = `./data/${ext}`
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
