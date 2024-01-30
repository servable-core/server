import featuresSubclass from "./featuresSubclass/index.js"
import adaptFeaturePayload from "../../utils/adaptFeaturePayload.js"

export default async ({
  classSchema,
  feature,
  allFeatures
}) => {
  try {
    const { className } = classSchema

    const _class = await feature.loader.getClass({ className })
    if (!_class) {
      return
    }

    let features = await feature.loader.classFeatures({ className })
    if (!features || !features.length) {
      Servable.App.Object.registerSubclass(classSchema.className, _class)
      return
    }

    features = features.map(adaptFeaturePayload)

    if (!features || !features.length) {
      Servable.App.Object.registerSubclass(classSchema.className, _class)
      return
    }

    let subclass = await featuresSubclass({ features, _class, allFeatures })
    if (!subclass) {
      subclass = _class
    }

    Servable.App.Object.registerSubclass(classSchema.className, subclass)
  }
  catch (e) {
    console.error(e)
  }
}
