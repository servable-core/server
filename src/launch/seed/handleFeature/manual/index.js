export default async ({ feature, operationProps }) => {
  const { file, } = feature
  await file({ ...operationProps })
}
