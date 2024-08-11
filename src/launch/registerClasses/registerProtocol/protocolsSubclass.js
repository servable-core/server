import _ from 'underscore'
import cleanProtocols from '../../../lib/utils/cleanProtocols.js'

export default async ({
  allProtocols,
  protocols,
  _class,
}) => {
  try {
    const applicableProtocols = allProtocols.filter(a => Boolean(_.findWhere(protocols, { id: a.id })))
    if (!applicableProtocols || !applicableProtocols.length) {
      return _class
    }

    let __class = _class
    let i = 0
    do {
      const applicableProtocol = applicableProtocols[i]
      const classFile = await applicableProtocol.loader.ownProtocolsClass()
      if (classFile) {
        __class = classFile({ ParentClass: __class })
        const classProtocols = await applicableProtocol.loader.ownProtocols()
        if (!__class.inheritedProtocols) {
          __class.inheritedProtocols = []
        }
        if (classProtocols) {
          __class.inheritedProtocols = [
            ...__class.inheritedProtocols,
            classProtocols
          ]
        }
        __class.inheritedProtocols = cleanProtocols(__class.inheritedProtocols)
      }

      i++
    } while (i < applicableProtocols.length)

    return __class
  }
  catch (e) {
    console.error(e)
  }

  return null
}
