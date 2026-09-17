// lucide (PEAKUB DX initiative): `@servable/server` sets `global.Servable = new ServableClass()`
// at boot (launch/index.js) - never imported, so no amount of per-file JSDoc gives app code
// autocomplete on it. This is the engine-agnostic half of that surface (Process, Services,
// LiveQueries, Operations, Express, Config, ServableConfig, engine, Console, httpServer,
// publicUrl, schema) - modeled from `src/domain/servable/index.js`, the class that actually
// builds it. `App` is deliberately loose here: its real shape is engine-specific (Object, Query,
// User, Cloud, Transaction, Jobs, Route, ...) and populated by whichever engine is wired in via
// `engine.adaptApp()` - see that engine's own global.d.ts (e.g.
// @servable/parse-server-engine's) for a typed `App`. An app consuming both packages gets the
// full picture; consuming this one alone only gets the parts @servable/server itself owns.
//
// A consuming app wires this in by including both packages' global.d.ts from its own
// jsconfig.json/tsconfig.json, e.g.:
//   { "include": ["node_modules/@servable/server/global.d.ts",
//                 "node_modules/@servable/parse-server-engine/global.d.ts", "**/*.js"] }

declare global {
  /** Whatever `engine.adaptApp()` returned, plus this package's own additions (Transaction if the
   * engine didn't provide one; a few User session-token methods). Deliberately left open (an
   * index signature, no named members) rather than typed fully here: TypeScript only allows a
   * global interface declared in one package to be sharpened by another (e.g. by
   * @servable/parse-server-engine's own global.d.ts, which merges named members like
   * `Object`/`Query`/`Cloud` into THIS interface) when the merged property is genuinely new, not
   * a second, conflicting declaration of the same property with a different type - confirmed via
   * a standalone tsc test, since TS's declaration-merging rule for a repeated property is "must
   * be identical", with no `any`-is-compatible-with-anything exception. It must also live inside
   * this `declare global` block (not as a plain top-level interface in this file) to actually be
   * ambient/mergeable across packages at all - a top-level interface in a file that has an
   * `export` (making it a module, as this one does) is scoped to that module, not global.
   * Consuming just this package gets `Servable.App` as this open shape; consuming an engine
   * package too gets it sharpened. */
  interface ServableApp {
    [key: string]: any
  }

  /** Every service any protocol has registered, keyed by its `id` (see
   * `domain/servable/services/index.js`'s real `register()`/`call()` - both take a single
   * object arg, not `(name, ...args)`). Deliberately empty here, sharpened per-app by
   * @servable/tools' generated protocol-resource types (`generateProtocolResourceTypes()`),
   * which merge in one literal-`id`-keyed entry per real service found in that app's own
   * protocols - see that function's own file for how.
   *
   * NOT given a `[id: string]: ...` fallback index signature the way `ServableApp` is: an index
   * signature makes `keyof ServableServiceCallMap` widen to plain `string` even after real
   * literal keys are merged in (confirmed via a standalone tsc test - TypeScript's `keyof` on an
   * interface with an index signature is always the index type, not the union of its literal
   * keys), which would silently defeat the one thing worth generating this for: catching a
   * misspelled `id` at the call site. The cost is that `Servable.Services.call()` doesn't
   * type-check *at all* until this app has run `servable schema protocol-types` at least once
   * (`keyof {}` is `never`) - an acceptable, deliberate tradeoff given that command is meant to
   * be run and committed the same way `servable schema types` already is. */
  interface ServableServiceCallMap {
  }

  /** Everything @servable/server itself attaches to the global `Servable` instance. */
  interface ServableRuntime {
    App: ServableApp

    /** A shared place for cross-protocol service registration/lookup. Real contract (see
     * `domain/servable/services/index.js`): `register()` is called by wireSchema at boot with
     * `{ service, protocol }` (`service` being a `services/*.js` file's whole default export,
     * `{ id, handler, version? }`) - not something app/protocol code calls directly. `call()`
     * is what protocol code actually uses, keyed by `id` (`params` narrows to that service's
     * real shape once @servable/tools' generated protocol-resource types are included - see
     * `ServableServiceCallMap` above). */
    Services: {
      register(props: { service: Record<string, any>, protocol?: any }): Promise<void>
      call<K extends keyof ServableServiceCallMap>(props: {
        id: K
        version?: string
        params: Parameters<ServableServiceCallMap[K]['handler']>[0]['params']
      }): ReturnType<ServableServiceCallMap[K]['handler']>
      [key: string]: any
    }

    /** LiveQuery class registration, populated during `wireSchema`. */
    LiveQueries: Record<string, any>

    /** Per-servableConfig operation registry (see `domain/servable/operations`). */
    Operations: Record<string, any>

    /** The underlying Express app/router wiring (see `domain/servable/express`). */
    Express: Record<string, any>

    /** Free-form process-lifetime state bag. */
    Process: Record<string, any>

    /** `servableconfigurable`'s live config store, keyed by config name. */
    Config: Record<string, any>

    /** The `servableConfig` this instance was hydrated with. */
    ServableConfig: Record<string, any>

    /** The engine module this instance was hydrated with (`createApp`, `launch`, `adaptApp`,
     * `createStateStore`, ...). */
    engine: Record<string, any>

    /** The built, validated schema this boot computed (`@servable/tools`' `buildSchema()`
     * output), set once boot reaches `start()` - `undefined` before then. */
    schema?: Record<string, any>

    /** The Node `console`, exposed here so protocol code doesn't need its own import. */
    Console: Console

    /** The engine's HTTP server instance, set once `createHttpServer()` runs - `undefined`
     * before then. */
    httpServer?: any

    /** This app's fully-qualified public URL (`serverURL` + mount path), set once boot resolves
     * it - `undefined` until then. */
    publicUrl?: string

    /**
     * @param servableConfig - see `launch()`'s own `servableConfig` parameter.
     * @param engine - the engine module.
     * @param app - the engine's own app instance (`engine.createApp()`'s result).
     */
    hydrate(props: { servableConfig: Record<string, any>, engine: Record<string, any>, app: any }): Promise<void>
  }

  // eslint-disable-next-line no-var
  var Servable: ServableRuntime
}

export {}
