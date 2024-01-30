import memwatch from 'node-memwatch-x'

export default props => {
  memwatch.on('leak', info => {
    console.log('[SERVABLE]', 'memwatch>leak', info)
  })
  memwatch.on('stats', info => {
    console.log('[SERVABLE]', 'memwatch>stats', info)
  })
}
