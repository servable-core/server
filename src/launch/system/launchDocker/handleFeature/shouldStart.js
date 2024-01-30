import targetComposePath from './utils/targetDockerComposePath.js'
import checkFileExists from '../../../utils/checkFileExists.js'

export default async ({
  item: feature,
  existingDockerCompose
}) => {

  //#TODO: feature.loader
  if (!(await feature.loader.systemDockerComposeExists())) {
    return false
  }

  const targetPath = targetComposePath({ feature })
  if (!(await checkFileExists(targetPath))) {
    return true
  }

  // if (!existingDockerCompose) {
  //     return true
  // }

  // const { services } = existingDockerCompose
  // return true
  return false
}

const servicesHaveChanged = (previous, current) => {
  if (previous.length !== current.length) {
    return true
  }

  return false
}
