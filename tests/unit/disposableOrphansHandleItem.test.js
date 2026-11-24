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
    await expect(handleItem({ object: objectHolding('pshIns', undefined), field: 'seeder' })).resolves.toBeUndefined()
  })
})
