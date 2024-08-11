export default async ({ protocol, version, direction }) => {

  const up = await protocol.loader.schemaVersionOf({
    version,
    subPath: 'up'
  })

  const down = await protocol.loader.schemaVersionOf({
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
