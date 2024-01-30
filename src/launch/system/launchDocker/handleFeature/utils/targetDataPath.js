import targetDockerPath from './targetDockerPath.js'

export default ({ feature }) => {
  return `${targetDockerPath({ feature })}/data`
}
