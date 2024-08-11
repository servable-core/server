import registerClass from './registerClass.js'

export default async ({
  protocol,
  allProtocols
}) => {
  //#TODO: protocol.schema
  const { classes: { managed } } = protocol.schema
  return Promise.all(managed.map(async classSchema => {
    await registerClass({
      allProtocols,
      protocol,
      classSchema
    })
  }))
}
