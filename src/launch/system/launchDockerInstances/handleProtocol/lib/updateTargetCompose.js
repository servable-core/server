import targetComposePath from "./targetDockerComposePath.js"
import fs from 'fs'
import ensureDirectoryExistsSync from "../../../../utils/ensureDirectoryExistsSync.js"

export default async ({
  protocol,
  data,
  servableConfig,
}) => {
  const targetPath = targetComposePath({ protocol, servableConfig })
  ensureDirectoryExistsSync(targetPath)
  return fs.promises.writeFile(targetPath, data)
}
