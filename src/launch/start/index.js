import boot from './boot/index.js'
// import memwatch from 'node-memwatch-x'

// handleDistribution/ (the pod-A-sees-pod-B-migrating watcher) removed - see
// .docs/technical/unischema-plan.md. It was already dead: its own body was entirely commented
// out, and even uncommented its imports pointed at a path that no longer existed
// (../../../../utils/utilsDatabase/... - the real path was lib/utilsDatabase) - it would have
// thrown on import, and never ran. The problem it was meant to solve (a pod on an old schema
// booting after a newer one already changed the database) is now solved differently - see
// boot/index.js's own compatibility-floor check, which runs before this pod ever finishes
// booting, rather than watching for another pod's migration after the fact.
export default async ({ servableConfig, app, schema, engine }) => {

  // Typed `any` rather than left to infer `null` - `hd` is only ever assigned via the
  // commented-out `new memwatch.HeapDiff()` below, so a precise type would narrow `if (hd)`
  // to unreachable and error on `.end()` inside it. This whole branch is dead until that
  // feature comes back (found via checkJs, lucide/PEAKUB DX initiative).
  /** @type {any} */
  let hd = null
  let launchedServer = null

  try {
    // hd = new memwatch.HeapDiff()
    console.log('[SERVABLE]', '[DEBUG]', 'launch>start> ')
    launchedServer = await boot({ servableConfig, app, schema, engine })
  } catch (e) {
    console.error('[SERVABLE]', '[DEBUG]', 'launch>start', e)
  }
  finally {
    if (hd) {
      const diff = hd.end()
      console.log('[SERVABLE]', '[DEBUG]', 'launch>start>heapdiff', diff)
    }
  }

  return launchedServer
}
