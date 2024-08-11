import ensureDirectoryExistsSync from "../../../../utils/ensureDirectoryExistsSync.js"
import checkFileExists from '../../../../utils/checkFileExists.js'
import copyDir from '../../../../utils/copyDir.js'
import targetDockerPath from "./targetDockerPath.js"

export default async (props) => {
  const {
    item: protocol,
    data
  } = props


  let dataPath = protocol.loader.systemDockerDataPath()
  if (!(await checkFileExists(dataPath))) {
    return
  }

  const _target = targetDockerPath({ protocol })
  ensureDirectoryExistsSync(_target)
  copyDir(dataPath, _target)
}

