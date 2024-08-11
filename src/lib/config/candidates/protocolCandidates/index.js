
export default async (props) => {
  //#TODO: protocol.schema
  const { classes: { managed }, } = props.item.schema
  const id = props.item.id

  let items = []

  let files = await props.item.loader.configDataFiles()
  if (files.entries) {
    let path = props.item.loader.configFolder()
    //let protocolMetadata = await props.item.loader.seedMetadata()
    const _i = {
      protocol: props.item,
      id,
      type: 'protocol',
      mode: 'auto',
      path,
      // metadata: protocolMetadata,
      files
    }

    items.push(_i)
  }

  await Promise.all(managed.map(async item => {
    const { className } = item

    let path = props.item.loader.classConfigFolder({ className })
    let files = await props.item.loader.classConfigDataFiles({ className })
    // let metadata = await props.item.loader.classSeedMetadata({ className })
    if (files.entries) {
      const _i = {
        protocol: props.item,
        id: className,
        type: 'class',
        // metadata,
        mode: 'auto',
        path,
        files
      }
      items.push(_i)
    }


  }))

  return items.filter(a => a)
}
