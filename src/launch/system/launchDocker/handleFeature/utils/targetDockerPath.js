import path from 'path'

export default ({ feature }) => {
  return path.resolve('', `.system/${feature.id}/docker`)
}
