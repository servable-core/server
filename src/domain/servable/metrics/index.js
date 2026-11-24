import { metrics as openTelemetryMetrics } from '@opentelemetry/api'

// Servable.App.Metrics taxonomy - how the engine, this package and the protocols count what they do, without importing
// the app that runs them, and the implementation wired in when an engine provides none (see ../index.js `hydrate()`), so
// `Servable.App.Metrics` is never undefined.
//
// Contract:
// - `counter(name, { description })` answers `{ name, add(value = 1, attributes = {}) }`.
// - `histogram(name, { description, bucketBoundaries })` answers `{ name, record(value, attributes = {}) }`;
//   `bucketBoundaries` (seconds, milliseconds, whatever the name says) is a hint the meter provider follows.
// - `gauge(name, { description })` answers `{ name, set(value, attributes = {}) }`, the last value set being the one read.
// - The same name always answers the same instrument (the first call's options win), so a hot path may ask for it on
//   every call. Names follow Prometheus: snake case, a counter ends in `_total`, a duration says its unit in the name
//   (`_seconds`); no `unit` option, the exporter would add it to the name a second time.
// - Attributes become labels: only values from closed lists (a class name, a route path, an outcome, a reason). Never a
//   token, a digest, an email, a name or a user or object id: each distinct value is a series kept for ever.
// - Nothing ever throws: a metric that cannot be recorded is skipped and said once per instrument, a request is never
//   failed by a count.
//
// This implementation records into the meter provider the process registered with `@opentelemetry/api` (an app exports it,
// backend/main as Prometheus text on its metrics port). With none registered, the API's own instruments do nothing: no
// cost, no error. The API has no proxy for meters, so each instrument is made again against the provider of the moment
// whenever that provider changed (one registered after the instrument was first asked for, as at boot).
// `@opentelemetry/api` is a peer dependency, as OpenTelemetry asks of libraries: the app's own copy is the one whose global
// meter provider this reads. A second, newer copy nested under this package would refuse the app's provider and every
// count would silently do nothing.
export const METRICS_METER_NAME = 'servable'

const KINDS = {
  counter: { create: (meter, name, options) => meter.createCounter(name, options), record: (instrument, value, attributes) => instrument.add(value, attributes) },
  histogram: { create: (meter, name, options) => meter.createHistogram(name, options), record: (instrument, value, attributes) => instrument.record(value, attributes) },
  gauge: { create: (meter, name, options) => meter.createGauge(name, options), record: (instrument, value, attributes) => instrument.record(value, attributes) },
}

/** @param {{ description?: string, bucketBoundaries?: number[] }} [options] */
const openTelemetryOptionsFrom = ({ description, bucketBoundaries } = {}) => {
  const options = {}
  if (description) {
    options.description = description
  }
  if (Array.isArray(bucketBoundaries) && bucketBoundaries.length) {
    options.advice = { explicitBucketBoundaries: bucketBoundaries }
  }
  return options
}

/**
 * Makes a metrics implementation on a meter provider source; `currentMeterProviderOf` is read at every record.
 * @param {object} [props]
 * @param {() => any} [props.currentMeterProviderOf]
 * @param {string} [props.meterName]
 * @param {{ error: (...args: any[]) => void }} [props.logger]
 */
export const createMetrics = ({
  currentMeterProviderOf = () => openTelemetryMetrics.getMeterProvider(),
  meterName = METRICS_METER_NAME,
  logger = console,
} = {}) => {
  const instrumentsByKey = new Map()

  const lazyInstrumentOf = ({ kind, name, options }) => {
    const key = `${kind}:${name}`
    const known = instrumentsByKey.get(key)
    if (known) {
      return known
    }
    const { create, record } = KINDS[kind]
    const openTelemetryOptions = openTelemetryOptionsFrom(options)
    let meterProviderOfInstrument = null
    let instrument = null
    let hasSaidItCannotRecord = false
    const recordValue = (value, attributes) => {
      try {
        const meterProvider = currentMeterProviderOf()
        if (meterProvider !== meterProviderOfInstrument) {
          instrument = create(meterProvider.getMeter(meterName), name, openTelemetryOptions)
          meterProviderOfInstrument = meterProvider
        }
        record(instrument, value, attributes || {})
      } catch (error) {
        if (!hasSaidItCannotRecord) {
          hasSaidItCannotRecord = true
          logger.error('[SERVABLE] [metrics] a value could not be recorded, skipped from now on without a word', { kind, name, reason: `${error?.message || error}` })
        }
      }
    }
    const handle = kind === 'counter'
      ? { name, add: (value = 1, attributes) => recordValue(value, attributes) }
      : kind === 'histogram'
        ? { name, record: (value, attributes) => recordValue(value, attributes) }
        : { name, set: (value, attributes) => recordValue(value, attributes) }
    instrumentsByKey.set(key, handle)
    return handle
  }

  return {
    /**
     * @param {string} name
     * @param {{ description?: string }} [options]
     */
    counter: (name, options) => lazyInstrumentOf({ kind: 'counter', name, options }),
    /**
     * @param {string} name
     * @param {{ description?: string, bucketBoundaries?: number[] }} [options]
     */
    histogram: (name, options) => lazyInstrumentOf({ kind: 'histogram', name, options }),
    /**
     * @param {string} name
     * @param {{ description?: string }} [options]
     */
    gauge: (name, options) => lazyInstrumentOf({ kind: 'gauge', name, options }),
  }
}

// Instruments that do nothing at all, for a caller that must count somewhere and has no Servable.App.Metrics (a test, a
// script run outside a launched app).
export const NoOpMetrics = {
  counter: (name) => ({ name, add: () => {} }),
  histogram: (name) => ({ name, record: () => {} }),
  gauge: (name) => ({ name, set: () => {} }),
}

export const MetricsContract = createMetrics()

export default MetricsContract
