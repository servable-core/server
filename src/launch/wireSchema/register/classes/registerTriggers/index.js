import * as ProtocolTriggers from './protocolTriggers/index.js'

export default async ({
  _class,
  protocol,
  protocolInstance,
  allProtocols
}) => {
  try {
    const { className } = _class

    if (className === "_Session") {
      return
    }

    const classTriggers = await protocol.loader.classTriggers({ className })
    if (!classTriggers) {
      // return
    }

    Servable.App.Cloud.beforeSave(className, async (request) => {
      try {
        await ProtocolTriggers.beforeSave({ request, protocol, protocolInstance, allProtocols })
        classTriggers && classTriggers.beforeSave && await classTriggers.beforeSave({ request, protocol, protocolInstance })
      } catch (e) {
        console.error(`[Class ${className}] ⚠️ beforeSave`, e.message)
      }
    })

    Servable.App.Cloud.afterSave(className, async (request) => {
      try {
        await ProtocolTriggers.afterSave({ request, protocol, protocolInstance, allProtocols })
        classTriggers && classTriggers.afterSave && await classTriggers.afterSave({ request, protocol, protocolInstance })
      } catch (e) {
        console.error(`[Class ${className}] ⚠️ afterSave`, e.message)
      }
    })

    Servable.App.Cloud.beforeDelete(className, async (request) => {
      try {
        await ProtocolTriggers.beforeDelete({ request, protocol, protocolInstance, allProtocols })
        classTriggers && classTriggers.beforeDelete && await classTriggers.beforeDelete({ request, protocol, protocolInstance })
      } catch (e) {
        console.error(`[Class ${className}] ⚠️ beforeDelete`, e.message)
      }
    })

    Servable.App.Cloud.afterDelete(className, async (request) => {
      try {
        await ProtocolTriggers.afterDelete({ request, protocol, protocolInstance, allProtocols })
        classTriggers && classTriggers.afterDelete && await classTriggers.afterDelete({ request, protocol, protocolInstance })
      } catch (e) {
        console.error(`[Class ${className}] ⚠️ afterDelete`, e.message)
      }
    })

    // Servable.App.Cloud.beforeFind(className, async (request) => {
    //   try {
    //     await ProtocolTriggers.beforeFind({ request, protocol, protocolInstance, allProtocols })
    //     classTriggers && classTriggers.beforeFind && await classTriggers.beforeFind({ request, protocol, protocolInstance })
    //   } catch (e) {
    //     console.error(`[Class ${className}] ⚠️ beforeFind`, e.message)
    //   }
    // })

    // Servable.App.Cloud.afterFind(className, async (request) => {
    //   try {
    //     await ProtocolTriggers.afterFind({ request, protocol, protocolInstance, allProtocols })
    //     classTriggers && classTriggers.afterFind && await classTriggers.afterFind({ request, protocol, protocolInstance })
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
