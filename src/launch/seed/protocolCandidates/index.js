
export default async ({ protocol }) => {
  //#TODO: protocol.schema
  const { classes: { managed }, } = protocol.schema
  const id = protocol.id

  let items = []

  let protocolMode = await protocol.loader.seedMode()
  switch (protocolMode) {
    case 'auto': {
      let path = protocol.loader.seedFolder()
      let protocolMetadata = await protocol.loader.seedMetadata()
      const _i = {
        protocol: protocol,
        id,
        type: 'protocol',
        mode: 'auto',
        path,
        metadata: protocolMetadata
      }

      items.push(_i)
    } break
    case 'manual': {
      let protocolFile = await protocol.loader.seedManual()
      let protocolMetadata = await protocol.loader.seedMetadata()
      const _i = {
        protocol: protocol,
        id,
        type: 'protocol',
        mode: 'manual',
        file: protocolFile,
        metadata: protocolMetadata
      }

      items.push(_i)
    } break
    default: break
  }

  await Promise.all(managed.map(async item => {
    const { className } = item
    let classMode = await protocol.loader.classSeedMode({ className })
    switch (classMode) {
      case 'auto': {
        let path = protocol.loader.classSeedFolder({ className })
        let files = await protocol.loader.classSeedAutoFiles({ className })
        let metadata = await protocol.loader.classSeedMetadata({ className })
        const _i = {
          protocol: protocol,
          id: className,
          type: 'class',
          metadata,
          mode: 'auto',
          path,
          files
        }
        items.push(_i)
      } break
      case 'manual': {
        let file = await protocol.loader.classSeedManual({ className })
        let metadata = await protocol.loader.classSeedMetadata({
          className
        })

        items.push({
          protocol: protocol,
          id: className,
          type: 'class',
          mode: 'manual',
          file,
          metadata
        })

      } break
      default: break
    }
  }))

  return items.filter(a => a)
}
