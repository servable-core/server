export default async ({ feature, version, direction }) => {

  const up = await feature.loader.schemaVersionOf({
    version,
    subPath: 'migration/up/index.js'
  })

  const down = await feature.loader.schemaVersionOf({
    version,
    subPath: 'migration/down/index.js'
  })

  if (direction === 'up' && !up) {
    return null
  }

  if (direction === 'down' && !down) {
    return null
  }

  return {
    version,
    up,
    down
  }
}
