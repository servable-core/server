import MetricsContract from '../../domain/servable/metrics/index.js'

// The metrics this package counts with: `Servable.App.Metrics` (an engine's own, when it brings one), else this package's
// implementation, which is also what `hydrate()` wires in. Read at each count, so a count made before the hydration (a test,
// a script) still lands somewhere and never throws.
export const serverMetrics = () => /** @type {any} */ (globalThis).Servable?.App?.Metrics || MetricsContract
