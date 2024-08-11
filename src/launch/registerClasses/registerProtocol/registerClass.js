import protocolsSubclass from "./protocolsSubclass.js"
import adaptProtocolPayload from "../../utils/adaptProtocolPayload.js"

export default async ({
  classSchema,
  protocol,
  allProtocols
}) => {
  try {
    const { className } = classSchema

    const _class = await protocol.loader.getClass({ className })
    if (!_class) {
      return
    }

    let protocols = await protocol.loader.classProtocols({ className })
    if (!protocols || !protocols.length) {
      Servable.App.Object.registerSubclass(classSchema.className, _class)
      return
    }

    protocols = protocols.map(adaptProtocolPayload)

    if (!protocols || !protocols.length) {
      Servable.App.Object.registerSubclass(classSchema.className, _class)
      return
    }

    let subclass = await protocolsSubclass({ protocols, _class, allProtocols })
    if (!subclass) {
      subclass = _class
    }

    Servable.App.Object.registerSubclass(classSchema.className, subclass)
  }
  catch (e) {
    console.error(e)
  }
}
