// Whether a route file's export is defined as a route, and why not when it is not (owner's Q1376 a, 2026-11-23).
//
// Synchronous on purpose: this was an `async` function, so `!validate()` tested a promise, was never true, and every
// route was defined, `disabled: true` ones and exports with no handler included.

/**
 * @param {{ route: any }} props
 * @returns {string | null} why the route is not defined, or null when it is
 */
export const reasonRouteIsNotDefined = ({ route }) => {
  if (!route || typeof route !== 'object') {
    return 'its file exports no route'
  }
  if (!route.handler) {
    return 'it has no handler'
  }
  if (route.disabled) {
    return 'it is disabled'
  }
  return null
}

/**
 * @param {{ route: any }} props
 * @returns {boolean}
 */
export default ({ route }) => reasonRouteIsNotDefined({ route }) === null
