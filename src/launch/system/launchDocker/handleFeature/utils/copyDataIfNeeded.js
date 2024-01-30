import ensureDirectoryExistsSync from "../../../../utils/ensureDirectoryExistsSync.js"
import checkFileExists from '../../../../utils/checkFileExists.js'
import copyDir from '../../../../utils/copyDir.js'
import targetDockerPath from "./targetDockerPath.js"

export default async (props) => {
  const {
    item: feature,
    data
  } = props


  let dataPath = feature.loader.systemDockerDataPath()
  if (!(await checkFileExists(dataPath))) {
    return
  }

  const _target = targetDockerPath({ feature })
  ensureDirectoryExistsSync(_target)
  copyDir(dataPath, _target)
}

