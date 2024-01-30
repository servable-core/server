import validate from './validate.js'

export default async ({
  route,
  feature }) => {

  if (!validate({ route })) {
    return
  }

  const targetPlaceholder = '{{$target}}'
  if (route.path.indexOf(targetPlaceholder) === -1) {
    return Servable.App.Route.define({
      ...route,
      path: route.path.toLowerCase()
    })
  }

  const instancesClassesPayloads = feature.instancesClassesPayloads()
  for (var i in instancesClassesPayloads) {
    const instancesClassesPayload = instancesClassesPayloads[i]
    const { instance } = instancesClassesPayload
    const path = route.path.replace(targetPlaceholder, instance.className)
    const _item = {
      ...route, path:
        path.toLowerCase()
    }
    Servable.App.Route.define(_item)
  }
}
