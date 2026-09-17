// @ts-nocheck - lucide (PEAKUB DX initiative): dead code, found via checkJs. Nothing imports
// this file (confirmed by a repo-wide grep - every real call site has its memwatch usage
// commented out, e.g. launch/index.js's own `// const heapDiff = new memwatch.HeapDiff()`),
// and 'node-memwatch-x' isn't installed as a dependency either.
// eslint-disable-next-line n/no-missing-import -- see the dead-code note above; already known.
import memwatch from 'node-memwatch-x'

export default props => {
  memwatch.on('leak', info => {
    console.log('[SERVABLE]', 'memwatch>leak', info)
  })
  memwatch.on('stats', info => {
    console.log('[SERVABLE]', 'memwatch>stats', info)
  })
}
