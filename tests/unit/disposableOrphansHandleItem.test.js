import handleItem from '../../src/protocols/disposableorphansable/lib/handleItem/index.js'

// The rows of a Relation orphan are read with the master key (Q1481 a, 2026-11-24). An object's delete runs its
// afterDelete with no user, and the class-level permissions of the related class (PublishableObjectIn behind a
// publication's `pshIns`, Reaction behind `rctEntries`) let no anonymous read through: the read found nothing and the
// rows outlived the object. Each row is still destroyed with the master key, one failure never stopping the others.

// A stand-in for Parse's relation: its query records the options it is read with and serves only a master-key read.
class ParseRelation {
  constructor(rows) {
    this.rows = rows
    this.readOptions = []
  }
  query() {
    const relation = this
    return {
      each: async (callback, options = {}) => {
        relation.readOptions.push(options)
        if (options.useMasterKey !== true) {
          return
        }
        for (const row of relation.rows) {
          await callback(row)
        }
      },
    }
  }
}

const rowOf = (id, { isFailing = false } = {}) => ({
  id,
  destroyOptions: null,
  isDestroyed: false,
  async destroy(options) {
    this.destroyOptions = options
    if (isFailing) {
      throw new Error('gone already')
    }
    this.isDestroyed = true
  },
})

const objectHolding = (field, value) => ({ get: (key) => (key === field ? value : undefined) })

describe('disposableorphansable: a Relation orphan', () => {
  test('is read with the master key, and each of its rows destroyed with it', async () => {
    const rows = [rowOf('i1'), rowOf('i2')]
    const relation = new ParseRelation(rows)

    await handleItem({ object: objectHolding('pshIns', relation), field: 'pshIns' })

    expect(relation.readOptions).toEqual([{ useMasterKey: true }])
    expect(rows.map((row) => row.isDestroyed)).toEqual([true, true])
    expect(rows.map((row) => row.destroyOptions)).toEqual([{ useMasterKey: true }, { useMasterKey: true }])
  })

  test('a row that fails to go never stops the others', async () => {
    const rows = [rowOf('r1', { isFailing: true }), rowOf('r2')]
    const relation = new ParseRelation(rows)
    const consoleError = console.error
    console.error = () => {}
    try {
      await handleItem({ object: objectHolding('rctEntries', relation), field: 'rctEntries' })
    } finally {
      console.error = consoleError
    }

    expect(rows[1].isDestroyed).toBe(true)
  })

  test('a field the object does not hold destroys nothing', async () => {
    await expect(handleItem({ object: objectHolding('pshIns', undefined), field: 'seeder' })).resolves.toEqual({ destroyed: 0, failed: 0 })
  })
})

// Production proof of the orphans' fix (owner's Q1580 a): every row destroyed after its parent is counted by the parent's class and
// the orphan field, and every row that failed to go too, through Servable.App.Metrics. Never an id.
describe('disposableorphansable: the counts', () => {
  const recordingMetrics = () => {
    const recorded = []
    return { recorded, counter: (name) => ({ add: (value, attributes) => recorded.push({ name, value, attributes }) }) }
  }
  const parentHolding = (field, value) => ({ className: 'Publication', get: (key) => (key === field ? value : undefined) })
  let consoleError
  beforeEach(() => { consoleError = console.error; console.error = () => {} })
  afterEach(() => { console.error = consoleError; delete globalThis.Servable })

  test('rows destroyed are counted by parent class and field (the healthy path): no failure counted', async () => {
    const metrics = recordingMetrics()
    globalThis.Servable = { App: { Metrics: metrics } }
    const handled = await handleItem({ object: parentHolding('pshIns', new ParseRelation([rowOf('i1'), rowOf('i2')])), field: 'pshIns' })
    expect(handled).toEqual({ destroyed: 2, failed: 0 })
    expect(metrics.recorded).toEqual([{ name: 'servable_orphans_destroyed_total', value: 2, attributes: { class_name: 'Publication', field: 'pshIns' } }])
  })

  test('a row that fails to go is counted as a failure (the alarm path), the others as destroyed', async () => {
    const metrics = recordingMetrics()
    globalThis.Servable = { App: { Metrics: metrics } }
    const handled = await handleItem({ object: parentHolding('members', [rowOf('m1', { isFailing: true }), rowOf('m2')]), field: 'members' })
    expect(handled).toEqual({ destroyed: 1, failed: 1 })
    expect(metrics.recorded).toEqual([
      { name: 'servable_orphans_destroyed_total', value: 1, attributes: { class_name: 'Publication', field: 'members' } },
      { name: 'servable_orphans_destroy_failed_total', value: 1, attributes: { class_name: 'Publication', field: 'members' } },
    ])
  })

  test('nothing to destroy counts nothing, and a contract that throws never fails the delete', async () => {
    const metrics = recordingMetrics()
    globalThis.Servable = { App: { Metrics: metrics } }
    await handleItem({ object: parentHolding('pshIns', undefined), field: 'pshIns' })
    expect(metrics.recorded).toEqual([])
    globalThis.Servable = { App: { Metrics: { counter: () => { throw new Error('broken') } } } }
    await expect(handleItem({ object: parentHolding('members', [rowOf('m3')]), field: 'members' })).resolves.toEqual({ destroyed: 1, failed: 0 })
  })
})
