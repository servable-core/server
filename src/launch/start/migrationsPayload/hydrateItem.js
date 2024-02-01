export default async ({ feature, version, direction }) => {

  const up = await feature.loader.schemaVersionOf({
    version,
    subPath: 'up'
  })

  const down = await feature.loader.schemaVersionOf({
    version,
    subPath: 'down'
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
