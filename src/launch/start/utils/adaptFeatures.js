import { sha256, } from 'js-sha256'

export default async ({ features }) => {
  return Promise.all(features.map(adaptFeature))
}

const adaptFeature = async (feature) => {
  const classes = await feature.loader.classesSchemas()
  const schema = await feature.loader.schemaRaw({ ad: "ee" })
  const schemaSHA = sha256(JSON.stringify(schema ? schema : classes))

  return {
    id: feature.id,
    version: feature.version,
    classes,
    schema,
    schemaSHA,
  }
}
