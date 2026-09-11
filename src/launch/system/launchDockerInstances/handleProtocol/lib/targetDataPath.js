import targetDockerPath from './targetDockerPath.js'

export default ({ protocol, servableConfig }) => {
  return `${targetDockerPath({ protocol, servableConfig })}/data`
}
