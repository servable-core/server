import semver from 'semver'
import hydrateItem from './hydrateItem.js'

export default async ({ payload, protocol }) => {
  const { from, to, direction } = payload

  let _versions = await protocol.loader.schemaVersions()
  if (!_versions || !_versions.length) {
    return null
  }

  if (direction === "down") {
    _versions = _versions.reverse()
  }

  let versions = []
  _versions.forEach(version => {
    if (direction === 'up' && semver.lte(version, from.version)) {
      return
    }

    if (direction === 'down' && semver.gte(version, from.version)) {
      return
    }

    if (direction === 'up' && semver.gt(version, to.version)) {
      return
    }

    if (direction === 'down' && semver.lt(version, to.version)) {
      return
    }

    versions.push(version)
  })

  if (!versions.length) {
    return null
  }

  const operations = (await Promise.all(versions.map(async version => hydrateItem({ protocol, version, direction })))).filter(a => a)
  if (!operations.length) {
    return null
  }

  return {
    ...payload,
    protocol,
    allVersions: _versions,
    applicableVersions: versions,
    operations
  }
}
