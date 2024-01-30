import updateVolumeDestination from './adaptVolume.js'
import adaptPort from './adaptPort.js'

export default async (props) => {
  const {
    item,
    service
  } = props

  let { volumes, ports } = service
  if (volumes && volumes.length) {
    volumes = volumes.map(volume => {
      return updateVolumeDestination({
        feature: item,
        volume
      })
    })
  }

  if (ports && ports.length) {
    ports = await Promise.all(ports.map(async port => {
      return adaptPort({
        feature: item,
        port
      })
    }))
  }

  return {
    ...service,
    volumes,
    ports
  }
}
