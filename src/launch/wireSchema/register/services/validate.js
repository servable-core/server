// Whether a service file's export is registered as a service, and why not when it is not (owner's Q1376 a, 2026-11-23).
//
// Synchronous on purpose: this was an `async` function, so `!validate()` tested a promise, was never true, and every
// export of a `services/` folder was registered, `disabled: true` ones and helpers with no handler included.
// A service needs a handler (what `Servable.Services.call` runs). Its `register` hook is optional, as
// `Servable.Services.register` already treats it (domain/servable/services/index.js): the old test also required it,
// which no service of backend/main has, so honouring that test would have dropped every service.

/**
 * @param {{ service: any }} props
 * @returns {string | null} why the service is not registered, or null when it is
 */
export const reasonServiceIsNotRegistered = ({ service }) => {
  if (!service || typeof service !== 'object') {
    return 'its file exports no service'
  }
  if (!service.handler) {
    return 'it has no handler'
  }
  if (service.disabled) {
    return 'it is disabled'
  }
  return null
}

/**
 * @param {{ service: any }} props
 * @returns {boolean}
 */
export default ({ service }) => reasonServiceIsNotRegistered({ service }) === null
