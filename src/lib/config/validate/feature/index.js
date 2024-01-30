
export default async (props) => {
  const { item, configuration } = props
  const { mode, type, id, files, feature, path } = item
  const { conditions, entries, groups } = files
  return { isValid: true, message: '' }
}
