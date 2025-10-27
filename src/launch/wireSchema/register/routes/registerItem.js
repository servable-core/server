import validate from './validate.js'
import userResolver from "./utils/userResolver.js"
export default async ({
  route,
  protocol,
  prefix = '' }) => {

  if (!validate({ route })) {
    return
  }

  const targetPlaceholder = '{{$target}}'
  if (route.path.indexOf(targetPlaceholder) === -1) {
    let path = route.path.toLowerCase()

    //#TODO:P1: Servable.App.Route.define should include servableArguments by default for functions called outside protocols
    return Servable.App.Route.define({
      ...route,
      prefix,
      path,
      servableArguments: async ({ request, response, native }) => ({
        userResolver: async ({ request: _request, options = {} } = {}) => {
          return userResolver({ request: _request ? _request : request, options })
        }
      })
    })
  }

  const instancesClassesPayloads = protocol.instancesClassesPayloads()
  for (var i in instancesClassesPayloads) {
    const instancesClassesPayload = instancesClassesPayloads[i]
    const { instance } = instancesClassesPayload
    let path = route.path.replace(targetPlaceholder, instance.className)
    path = path.toLowerCase()

    const _item = {
      ...route,
      path,
      prefix,
    }
    Servable.App.Route.define(_item)
  }
}
