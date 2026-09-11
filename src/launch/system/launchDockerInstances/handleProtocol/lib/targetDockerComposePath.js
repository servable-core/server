import targetDockerPath from './targetDockerPath.js'

export default ({ protocol, servableConfig }) => {
  return `${targetDockerPath({ protocol, servableConfig })}/docker-compose.yaml`
}

export const shaPath = ({ protocol, servableConfig }) => {
  return `${targetDockerPath({ protocol, servableConfig })}/.sha.txt`
}
