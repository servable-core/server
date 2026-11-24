import { jest } from '@jest/globals'
import ServableClass from '../../src/domain/servable/index.js'
import MetricsContract, { createMetrics, NoOpMetrics, METRICS_METER_NAME } from '../../src/domain/servable/metrics/index.js'

// Servable.App.Metrics is never undefined: the engine's own when it has one, else this package's, which records into the
// process's OpenTelemetry meter provider and does nothing when none is registered (src/domain/servable/metrics/index.js).

const hydratedWith = async (app) => {
  const servable = new ServableClass()
  const engine = { adaptApp: async () => app }
  await servable.hydrate({ servableConfig: {}, engine, app: {} })
  return servable
}

// A meter provider that keeps every instrument made and every value recorded, in place of the OpenTelemetry SDK's.
const recordingMeterProvider = () => {
  const made = []
  const recorded = []
  const instrumentOf = (kind) => (name, options) => {
    made.push({ kind, name, options })
    const recordValue = (value, attributes) => recorded.push({ kind, name, value, attributes })
    return { add: recordValue, record: recordValue }
  }
  const meterNames = []
  return {
    made,
    recorded,
    meterNames,
    getMeter: (meterName) => {
      meterNames.push(meterName)
      return { createCounter: instrumentOf('counter'), createHistogram: instrumentOf('histogram'), createGauge: instrumentOf('gauge') }
    },
  }
}

describe('Servable.App.Metrics', () => {
  test('is the engine\'s own when it has one', async () => {
    const own = { counter: () => ({ add: () => {} }) }
    const servable = await hydratedWith({ Metrics: own })
    expect(servable.App.Metrics).toBe(own)
  })

  test('falls back to this package\'s implementation', async () => {
    const servable = await hydratedWith({})
    expect(servable.App.Metrics).toBe(MetricsContract)
  })

  test('with no meter provider registered, every instrument does nothing and never throws', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => MetricsContract.counter('servable_test_counter_total').add(1, { outcome: 'hit' })).not.toThrow()
    expect(() => MetricsContract.histogram('servable_test_seconds', { bucketBoundaries: [1, 5] }).record(2)).not.toThrow()
    expect(() => MetricsContract.gauge('servable_test_entries').set(3)).not.toThrow()
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  test('the no-op metrics answer the same shape', () => {
    expect(NoOpMetrics.counter('a_total').add(1)).toBeUndefined()
    expect(NoOpMetrics.histogram('a_seconds').record(1)).toBeUndefined()
    expect(NoOpMetrics.gauge('a').set(1)).toBeUndefined()
  })
})

describe('createMetrics', () => {
  test('records counters, histograms and gauges with their attributes, on the servable meter', () => {
    const meterProvider = recordingMeterProvider()
    const metrics = createMetrics({ currentMeterProviderOf: () => meterProvider })
    metrics.counter('route_cache_lookups_total', { description: 'd' }).add(1, { outcome: 'hit' })
    metrics.counter('route_cache_lookups_total').add(undefined, { outcome: 'miss' })
    metrics.histogram('lag_seconds', { bucketBoundaries: [1, 5, 15] }).record(4, { route: 'explore' })
    metrics.gauge('entries').set(7)

    expect(meterProvider.meterNames.every((meterName) => meterName === METRICS_METER_NAME)).toBe(true)
    expect(meterProvider.recorded).toEqual([
      { kind: 'counter', name: 'route_cache_lookups_total', value: 1, attributes: { outcome: 'hit' } },
      { kind: 'counter', name: 'route_cache_lookups_total', value: 1, attributes: { outcome: 'miss' } },
      { kind: 'histogram', name: 'lag_seconds', value: 4, attributes: { route: 'explore' } },
      { kind: 'gauge', name: 'entries', value: 7, attributes: {} },
    ])
    expect(meterProvider.made).toEqual([
      { kind: 'counter', name: 'route_cache_lookups_total', options: { description: 'd' } },
      { kind: 'histogram', name: 'lag_seconds', options: { advice: { explicitBucketBoundaries: [1, 5, 15] } } },
      { kind: 'gauge', name: 'entries', options: {} },
    ])
  })

  test('the same name answers the same instrument, made once while the provider stays the same', () => {
    const meterProvider = recordingMeterProvider()
    const metrics = createMetrics({ currentMeterProviderOf: () => meterProvider })
    const first = metrics.counter('a_total')
    expect(metrics.counter('a_total')).toBe(first)
    first.add(1)
    first.add(1)
    expect(meterProvider.made).toHaveLength(1)
  })

  test('an instrument asked for before the provider is registered records into it once it is (lazy re-binding)', () => {
    const before = recordingMeterProvider()
    const after = recordingMeterProvider()
    let current = before
    const metrics = createMetrics({ currentMeterProviderOf: () => current })
    const counter = metrics.counter('a_total')
    counter.add(1)
    current = after
    counter.add(2)
    expect(before.recorded.map(({ value }) => value)).toEqual([1])
    expect(after.recorded.map(({ value }) => value)).toEqual([2])
  })

  test('a provider that throws never fails the caller, and says so once', () => {
    const logger = { error: jest.fn() }
    const metrics = createMetrics({ currentMeterProviderOf: () => { throw new Error('broken') }, logger })
    const counter = metrics.counter('a_total')
    expect(() => counter.add(1)).not.toThrow()
    expect(() => counter.add(1)).not.toThrow()
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error.mock.calls[0][1]).toEqual({ kind: 'counter', name: 'a_total', reason: 'broken' })
  })
})
