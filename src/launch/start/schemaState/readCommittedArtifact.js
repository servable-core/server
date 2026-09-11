import fs from 'fs'
import path from 'path'

// The committed servable.schema.json, read the same way the CLI does (schema/build.js et al in
// @servable/cli) - from the app's own working directory, which is always where the process was
// launched (`node index.js` from inside the app, matching how servable.config.js itself is
// resolved). Returns null (not an error) only for an app that has never once run
// `servable schema build` - every real deploy is expected to have committed one.
const ARTIFACT_FILENAME = 'servable.schema.json'

export default ({ cwd = process.cwd() } = {}) => {
  const artifactPath = path.resolve(cwd, ARTIFACT_FILENAME)
  if (!fs.existsSync(artifactPath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
}
