import registerClass from './registerClass.js'

export default async ({
  feature,
  allFeatures
}) => {
  //#TODO: feature.schema
  const { classes: { managed } } = feature.schema
  return Promise.all(managed.map(async classSchema => {
    await registerClass({
      allFeatures,
      feature,
      classSchema
    })
  }))
}
