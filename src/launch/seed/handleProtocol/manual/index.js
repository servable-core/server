export default async ({ protocol, operationProps }) => {
  const { file, } = protocol
  await file({ ...operationProps })
}
