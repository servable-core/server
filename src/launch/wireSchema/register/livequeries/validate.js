// Whether a live query file's export is registered, and why not when it is not (owner's Q1376 a, 2026-11-23).
//
// Synchronous on purpose: this was an `async` function, so `!validate()` tested a promise, was never true, and every
// live query was registered, `disabled: true` ones and exports with no query included.

/**
 * @param {{ liveQuery: any }} props
 * @returns {string | null} why the live query is not registered, or null when it is
 */
export const reasonLiveQueryIsNotRegistered = ({ liveQuery }) => {
  if (!liveQuery || typeof liveQuery !== 'object') {
    return 'its file exports no live query'
  }
  if (!liveQuery.query) {
    return 'it has no query'
  }
  if (liveQuery.disabled) {
    return 'it is disabled'
  }
  return null
}

/**
 * @param {{ liveQuery: any }} props
 * @returns {boolean}
 */
export default ({ liveQuery }) => reasonLiveQueryIsNotRegistered({ liveQuery }) === null
