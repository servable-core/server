import { runInRequestScopeOf, isRequestAbortedError } from './index.js'

// Wraps one route definition so everything the route runs (resolving the user, then the handler)
// executes inside the request scope of the native request it is serving. The scope is created the
// first time a request reaches a route and re-entered after that, so every piece of one request
// shares it.
export const wrapRouteDefinition = (options) => {
  if (!options || typeof options !== 'object') {
    return options
  }
  const { handler, servableArguments } = options
  const wrapped = { ...options }

  if (typeof handler === 'function') {
    wrapped.handler = (...handlerArguments) =>
      runInRequestScopeOf({
        nativeRequest: handlerArguments[0]?.native?.request,
        nativeResponse: handlerArguments[0]?.native?.response,
        // The client is gone, so there is nobody to answer: drop quietly (no 500, no report).
        work: async () => {
          try {
            return await handler(...handlerArguments)
          } catch (error) {
            if (isRequestAbortedError(error)) {
              return undefined
            }
            throw error
          }
        },
      })
  }

  if (typeof servableArguments === 'function') {
    wrapped.servableArguments = (argumentsOfRequest) => {
      const nativeRequest = argumentsOfRequest?.native?.request
      const nativeResponse = argumentsOfRequest?.native?.response
      return runInRequestScopeOf({
        nativeRequest,
        nativeResponse,
        work: async () => {
          const resolved = await servableArguments(argumentsOfRequest)
          if (resolved && typeof resolved.userResolver === 'function') {
            const userResolver = resolved.userResolver
            return {
              ...resolved,
              userResolver: (...resolverArguments) =>
                runInRequestScopeOf({
                  nativeRequest,
                  nativeResponse,
                  work: () => userResolver(...resolverArguments),
                }),
            }
          }
          return resolved
        },
      })
    }
  }

  return wrapped
}

// Makes every `Servable.App.Route.define` call, whoever makes it (protocols, the app, the launch
// health check), run its routes inside a request scope. Idempotent.
export const wrapRouteDefine = ({ Route }) => {
  if (!Route || typeof Route.define !== 'function' || Route.define.isRequestScoped) {
    return
  }
  const originalDefine = Route.define
  const scopedDefine = function (options, ...rest) {
    return originalDefine.call(this, wrapRouteDefinition(options), ...rest)
  }
  scopedDefine.isRequestScoped = true
  Route.define = scopedDefine
}
