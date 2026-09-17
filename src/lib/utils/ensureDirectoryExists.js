import fs from 'fs'
import path from 'path'
import checkFileExists from './checkFileExists.js'

/**
 * Ensures the directory containing `filePath` exists, creating any missing parent
 * directories along the way (like `mkdir -p`).
 *
 * Real bug, found via checkJs (lucide, PEAKUB DX initiative): the previous body had the
 * exist-check inverted (returned success when the directory was *missing*, before ever
 * creating it) and imported `./checkFileExists` with no extension, which throws
 * `ERR_MODULE_NOT_FOUND` under Node ESM. Live via local-dev docker orchestration
 * (copyDataIfNeeded.js, updateTargetCompose.js) - has never actually worked.
 *
 * @param {string} filePath - a file path whose parent directory should exist.
 * @returns {Promise<true>} resolves once the directory exists (or already did).
 */
const operation = async filePath => {
  const dirname = path.dirname(filePath)
  if (await checkFileExists(dirname)) {
    return true
  }
  await fs.promises.mkdir(dirname, { recursive: true })
  return true
}

export default operation
