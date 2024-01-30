import getMigrationsPayload from "../migrationsPayload/index.js"
import adaptFeatures from "../utils/adaptFeatures.js"
// Import { sha256, } from 'js-sha256'

export default async ({ schema, stateItem }) => {
  const storedFeaturesStruct = stateItem.features
    ? JSON.parse(stateItem.features)
    : null
  // Const s = sha256(JSON.stringify(storedFeaturesStruct))

  const targetFeaturesStruct = await adaptFeatures({
    features: schema.features
  })
  // Const t = sha256(JSON.stringify(targetFeaturesStruct))


  const items = await getMigrationsPayload({
    a: storedFeaturesStruct,
    b: targetFeaturesStruct,
    features: schema.features
  })

  return items
}
