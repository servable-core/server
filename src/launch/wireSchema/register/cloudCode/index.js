import registerFile from './registerFile.js'

export default async ({ files, prefix }) => {
  if (!files) {
    return
  }

  await Promise.all(files.map(async file => registerFile({ file, prefix })))
}
