import * as FeatureTriggers from './featureTriggers/index.js'

export default async ({
  _class,
  feature,
  featureInstance,
  allFeatures
}) => {
  try {
    const { className } = _class

    if (className === "_Session") {
      return
    }

    const classTriggers = await feature.loader.classTriggers({ className })
    if (!classTriggers) {
      // return
    }

    Servable.App.Cloud.beforeSave(className, async (request) => {
      try {
        await FeatureTriggers.beforeSave({ request, feature, featureInstance, allFeatures })
        classTriggers && classTriggers.beforeSave && await classTriggers.beforeSave({ request, feature, featureInstance })
        classTriggers && classTriggers.beforesave && await classTriggers.beforesave({ request, feature, featureInstance })
      } catch (e) {
        console.error(`[Class ${className}] ⚠️ beforeSave`, e.message)
      }
    })

    Servable.App.Cloud.afterSave(className, async (request) => {
      try {
        await FeatureTriggers.afterSave({ request, feature, featureInstance, allFeatures })
        classTriggers && classTriggers.afterSave && await classTriggers.afterSave({ request, feature, featureInstance })
        classTriggers && classTriggers.aftersave && await classTriggers.aftersave({ request, feature, featureInstance })
      } catch (e) {
        console.error(`[Class ${className}] ⚠️ afterSave`, e.message)
      }
    })

    Servable.App.Cloud.beforeDelete(className, async (request) => {
      try {
        await FeatureTriggers.beforeDelete({ request, feature, featureInstance, allFeatures })
        classTriggers && classTriggers.beforeDelete && await classTriggers.beforeDelete({ request, feature, featureInstance })
        classTriggers && classTriggers.beforedelete && await classTriggers.beforedelete({ request, feature, featureInstance })
      } catch (e) {
        console.error(`[Class ${className}] ⚠️ beforeDelete`, e.message)
      }
    })

    Servable.App.Cloud.afterDelete(className, async (request) => {
      try {
        await FeatureTriggers.afterDelete({ request, feature, featureInstance, allFeatures })
        classTriggers && classTriggers.afterDelete && await classTriggers.afterDelete({ request, feature, featureInstance })
        classTriggers && classTriggers.afterdelete && await classTriggers.afterdelete({ request, feature, featureInstance })
      } catch (e) {
        console.error(`[Class ${className}] ⚠️ afterDelete`, e.message)
      }
    })

    // Servable.App.Cloud.beforeFind(className, async (request) => {
    //   try {
    //     await FeatureTriggers.beforeFind({ request, feature, featureInstance, allFeatures })
    //     classTriggers && classTriggers.beforeFind && await classTriggers.beforeFind({ request, feature, featureInstance })
    //   } catch (e) {
    //     console.error(`[Class ${className}] ⚠️ beforeFind`, e.message)
    //   }
    // })

    // Servable.App.Cloud.afterFind(className, async (request) => {
    //   try {
    //     await FeatureTriggers.afterFind({ request, feature, featureInstance, allFeatures })
    //     classTriggers && classTriggers.afterFind && await classTriggers.afterFind({ request, feature, featureInstance })
    //   } catch (e) {
    //     console.error(`[Class ${className}] ⚠️ afterFind`, e.message)
    //   }
    // })
  }
  catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') {
      console.error(e)
    }
  }
}
