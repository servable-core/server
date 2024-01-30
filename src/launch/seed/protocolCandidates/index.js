
export default async ({ feature }) => {
  //#TODO: feature.schema
  const { classes: { managed }, } = feature.schema
  const id = feature.id

  let items = []

  let featureMode = await feature.loader.seedMode()
  switch (featureMode) {
    case 'auto': {
      let path = feature.loader.seedFolder()
      let featureMetadata = await feature.loader.seedMetadata()
      const _i = {
        feature: feature,
        id,
        type: 'feature',
        mode: 'auto',
        path,
        metadata: featureMetadata
      }

      items.push(_i)
    } break
    case 'manual': {
      let featureFile = await feature.loader.seedManual()
      let featureMetadata = await feature.loader.seedMetadata()
      const _i = {
        feature: feature,
        id,
        type: 'feature',
        mode: 'manual',
        file: featureFile,
        metadata: featureMetadata
      }

      items.push(_i)
    } break
    default: break
  }

  await Promise.all(managed.map(async item => {
    const { className } = item
    let classMode = await feature.loader.classSeedMode({ className })
    switch (classMode) {
      case 'auto': {
        let path = feature.loader.classSeedFolder({ className })
        let files = await feature.loader.classSeedAutoFiles({ className })
        let metadata = await feature.loader.classSeedMetadata({ className })
        const _i = {
          feature: feature,
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
        let file = await feature.loader.classSeedManual({ className })
        let metadata = await feature.loader.classSeedMetadata({
          className
        })

        items.push({
          feature: feature,
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
