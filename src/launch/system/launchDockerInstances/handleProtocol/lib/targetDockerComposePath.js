import targetDockerPath from './targetDockerPath.js'

export default ({ protocol }) => {
  return `${targetDockerPath({ protocol })}/docker-compose.yaml`
}

export const shaPath = ({ protocol }) => {
  return `${targetDockerPath({ protocol })}/.sha.txt`
}
