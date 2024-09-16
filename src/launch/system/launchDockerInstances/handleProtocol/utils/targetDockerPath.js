import path from 'path'

export default ({ protocol }) => {
  return path.resolve('', `.system/${protocol.id}/docker`)
}
