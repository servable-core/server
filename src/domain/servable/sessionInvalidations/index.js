// Servable.App.SessionInvalidations taxonomy - how an engine tells @servable/server that what a session token resolves
// to may have changed, and the fallback wired in when an engine has no such reports (see ../index.js `hydrate()`), so
// the name is never undefined.
//
// Contract:
// - `subscribe(listener)` answers `{ isReported, reason?, unsubscribe }`. When `isReported` is true, the engine calls
//   `listener(invalidation)` for every change it sees in this process, after it happened or before it can be read
//   back: `{ sessionToken }` (that session was deleted or changed), `{ sessionId }` (that session changed), `{ userId }`
//   (that user, or all its sessions, changed), `{ isEverything: true }` (a change whose target is unknown). It never
//   throws, and a listener that throws never fails the write.
// - When `isReported` is false the listener is never called: a cache keyed on sessions must then not be used
//   (src/lib/sessionUserCache does not start).
// Reports are per process: another replica's writes are not seen (the cache's time to live bounds those).
export const SessionInvalidationsContract = {
  /**
   * @param {(invalidation: { sessionToken?: string, sessionId?: string, userId?: string, isEverything?: boolean }) => void} _listener
   * @returns {Promise<{ isReported: boolean, reason?: string, unsubscribe: () => void }>}
   */
  subscribe: async (_listener) => ({
    isReported: false,
    reason: 'this engine does not report session invalidations (Servable.App.SessionInvalidations is not implemented by it)',
    unsubscribe: () => {},
  }),
}

export default SessionInvalidationsContract
