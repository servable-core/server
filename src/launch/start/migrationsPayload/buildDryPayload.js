import semver from 'semver'
import _ from 'underscore'
import { diff } from 'json-diff'

export default async (props) => {
  const { a, b } = props

  //#TODO: Handle deleted protocols
  const items = b.map(to => {
    const from = _.findWhere(a, { id: to.id })
    if (!from) {
      //#TODO: to fix bugs for no migration when the protocol is new
      return {
        to,
        from: to,
        direction: 'inversion'
      }
      return null
    }

    if (!semver.valid(from.version)) {
      return null
    }

    if (semver.eq(to.version, from.version)) {
      const differences = diff(to.schema, from.schema)
      if (!differences || differences.length) {
        return null
      }

      // if (to.schemaSHA === from.schemaSHA) {
      //   return null
      // }

      return {
        to,
        from,
        direction: 'inversion'
      }
    }

    if (semver.lt(to.version, from.version)) {
      return {
        to,
        from,
        direction: 'down'
      }
    }

    return {
      to,
      from,
      direction: 'up'
    }
  })

  return items.filter(a => a)
}
