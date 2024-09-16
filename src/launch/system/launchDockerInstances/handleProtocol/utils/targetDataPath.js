import targetDockerPath from './targetDockerPath.js'

export default ({ protocol }) => {
  return `${targetDockerPath({ protocol })}/data`
}
