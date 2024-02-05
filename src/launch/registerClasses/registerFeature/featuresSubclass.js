import _ from 'underscore'
import cleanFeatures from '../../../lib/utils/cleanFeatures.js'

export default async ({
  allFeatures,
  features,
  _class,
}) => {
  try {
    const applicableFeatures = allFeatures.filter(a => Boolean(_.findWhere(features, { id: a.id })))
    if (!applicableFeatures || !applicableFeatures.length) {
      return _class
    }

    let __class = _class
    let i = 0
    do {
      const applicableFeature = applicableFeatures[i]
      const classFile = await applicableFeature.loader.ownFeaturesClass()
      if (classFile) {
        __class = classFile({ ParentClass: __class })
        const classFeatures = await applicableFeature.loader.ownFeatures()
        if (!__class.inheritedFeatures) {
          __class.inheritedFeatures = []
        }
        if (classFeatures) {
          __class.inheritedFeatures = [
            ...__class.inheritedFeatures,
            classFeatures
          ]
        }
        __class.inheritedFeatures = cleanFeatures(__class.inheritedFeatures)
      }

      i++
    } while (i < applicableFeatures.length)

    return __class
  }
  catch (e) {
    console.error(e)
  }

  return null
}
