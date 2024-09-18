import targetComposePath, { shaPath } from "./targetDockerComposePath.js"
import fs from 'fs'
import ensureDirectoryExistsSync from "../../../../utils/ensureDirectoryExistsSync.js"

export default async ({
  protocol,
  data,
  sha
}) => {
  // const _shaPath = shaPath({ protocol })
  // ensureDirectoryExistsSync(_shaPath)
  // await fs.promises.writeFile(_shaPath, sha)

  const targetPath = targetComposePath({ protocol })
  ensureDirectoryExistsSync(targetPath)
  return fs.promises.writeFile(targetPath, data)
}

