// Servable.App.Transaction taxonomy - the contract every engine's own
// Transaction implementation is expected to conform to. This base class is
// also the fallback @servable/server wires in when an engine doesn't
// provide its own (see ../index.js `hydrate()`), so `Servable.App.Transaction`
// is never undefined - it just throws a clear "not implemented" error on
// commit/rollback for engines that haven't wired real transaction support.
//
// Contract:
// - `new Transaction(options)` opens a transaction. `options` are the
//   engine-specific write options (e.g. `useMasterKey`) applied once, to
//   the whole committed batch - not re-specified per individual call.
// - `token` (string) uniquely identifies this transaction instance. Callers
//   that need to correlate a write with a transaction across process/call
//   boundaries can use it; most callers won't need to touch it directly.
// - `state` is one of: 'open' -> 'committed' | 'aborted' | 'failed'.
//   'failed' means commit() was attempted and threw - the transaction is
//   over, nothing further can be done with it.
// - Two ways to associate a write with a transaction (engines should
//   support the first; the second is a lower-level escape hatch):
//   1. Pass the transaction instance itself as a write option:
//      `obj.save(attrs, { transaction: tx })`. The engine recognizes this
//      and defers the write instead of sending it immediately.
//   2. `tx.toWriteOptions(options)` - for call sites that don't go through
//      an engine-patched write path (e.g. a raw REST/cloud call), stamps
//      `context.servableTransactionToken` onto the options so the engine
//      can still correlate it if it inspects context.
// - `commit()` sends every deferred write as one real, atomic operation
//   against the backing store (not a sequential replay of individual
//   writes - that gives zero atomicity, which is exactly the bug this
//   taxonomy exists to prevent engines from reintroducing). If commit
//   fails partway, no partial writes should be visible - either the whole
//   batch is applied or none of it is.
// - v1 scope: a single transaction may only contain one *kind* of write
//   (e.g. only saves, or only destroys) - not both mixed together. An
//   engine that can't guarantee atomicity across mixed kinds must reject
//   the commit with a clear error rather than silently running the kinds
//   as separate, non-atomic operations. Engines are free to lift this
//   restriction later if they can guarantee real cross-kind atomicity.
// - `rollback()` discards whatever was deferred without sending anything.
//   Since nothing was sent yet, this never needs a compensating action -
//   if it does for a given engine, that engine's design is wrong.
export default class ServableTransaction {
  _state = 'open'
  _token = null
  _options = {}
  _writes = 0

  get state() { return this._state }
  get token() { return this._token }
  get options() { return this._options }
  get writes() { return this._writes }

  constructor(options = {}) {
    this._options = { ...options }
    this._token = options.token
      ? `${options.token}`
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  _assertOpen() {
    if (this._state !== 'open') {
      throw new Error(`Transaction is already ${this._state}`)
    }
  }

  toWriteOptions(options = {}) {
    this._assertOpen()
    const _options = (options && typeof options === 'object') ? options : {}

    return {
      ..._options,
      context: {
        ...(_options.context || {}),
        servableTransactionToken: this._token,
      },
      transaction: true,
    }
  }

  async commit() {
    this._assertOpen()
    throw new Error('This engine does not implement transaction commit')
  }

  async rollback() {
    this._assertOpen()
    throw new Error('This engine does not implement transaction rollback')
  }
}
