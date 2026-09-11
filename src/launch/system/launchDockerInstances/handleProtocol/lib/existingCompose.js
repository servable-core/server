import targetComposePath from './targetDockerComposePath.js'
import checkFileExists from '../../../../utils/checkFileExists.js'
import * as compose from 'docker-compose'
import targetDockerPath from './targetDockerPath.js'

export default async ({
  protocol,
  servableConfig,
}) => {

  const targetPath = targetComposePath({ protocol, servableConfig })
  if (!(await checkFileExists(targetPath))) {
    return null
  }

  const targetPathDocker = targetDockerPath({ protocol, servableConfig })
  const config = await compose.config({
    cwd: targetPathDocker,
  })

  return config.data.config
}
