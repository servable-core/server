import buildDryPayload from './buildDryPayload.js'
import _ from 'underscore'
import computeOperations from './computeOperations.js'

export default async (props) => {
  const { a, b } = props
  if (!a) {
    return null
  }

  const payload = await buildDryPayload(props)

  if (!payload || !payload.length) {
    return null
  }

  const { features } = props

  let items = await Promise.all(payload.map(async payload => {
    const feature = _.findWhere(features, { id: payload.from.id })
    if (!feature) {
      return null
    }
    return computeOperations({
      payload,
      feature
    })
  }))

  items = items.filter(a => a)
  return items
}
