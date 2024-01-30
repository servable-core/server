import targetComposePath from "./targetDockerComposePath.js"
import fs from 'fs'
import ensureDirectoryExistsSync from "../../../../utils/ensureDirectoryExistsSync.js"

export default async (props) => {
  const {
    item: feature,
    data
  } = props

  let targetPath = targetComposePath({ feature })

  ensureDirectoryExistsSync(targetPath)
  return fs.promises.writeFile(targetPath, data)
}

