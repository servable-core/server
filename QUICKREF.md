# @servable/server — Quick Reference

## Schema (unischema)

No commands here — schema is built/diffed/committed via `@servable/cli` (`servable schema build|plan|apply|contract`, see that package's own `QUICKREF.md`) in the consuming app, before deploy. What this package does is check the *result* at boot:

```js
// launch/start/schemaState/checkSchemaCompatibility.js - runs automatically inside launch()
```

- Throws if the committed `servable.schema.json` doesn't match what `buildSchema()` produces from current sources right now (forgot to run `schema build`/`apply`/`commit`).
- Throws if this build's `compatibilityFloor` is lower than what's recorded in the database (`ServableSchemaState`) — a newer deploy already ran `schema contract` and removed something this build's code may still expect.
- On success, persists this build's hash/floor to `ServableSchemaState` (raising the stored floor if this build's is higher, never lowering it).

Both failures surface as a normal boot failure (`quit()`, same as any other fatal boot error) with a message naming the actual mismatch — nothing silent.

See `CLAUDE.md` for what this replaced (the old version-comparison migration machinery) and why.

## Transactions

`Servable.App.Transaction` is a taxonomy, not an implementation - this package (`server/src/domain/servable/transaction/index.js`) defines the *shape* every engine's own Transaction class is expected to conform to, and supplies a safe no-op fallback (throws a clear "not implemented" error on `commit()`/`rollback()`) for any engine that hasn't wired real support. `Servable.App.Transaction` is therefore never `undefined` - see `hydrate()` in `server/src/domain/servable/index.js`:

```js
this.App = await this._engine.adaptApp({ servableConfig })
if (!this.App.Transaction) {
  this.App.Transaction = TransactionContract   // the fallback in this package
}
```

For concrete, working usage examples, see `@servable/parse-server-engine`'s own `QUICKREF.md` and `backend/main`'s `QUICKREF.md` - this doc is about the contract engines implement, not day-to-day usage.

### The contract

```js
class ServableTransaction {
  constructor(options)   // options are engine-specific write options (e.g. useMasterKey),
                          // applied once to the whole committed batch - not per call

  get token()             // string, uniquely identifies this transaction instance
  get state()             // 'open' -> 'committed' | 'aborted' | 'failed'
  get options()           // the options passed to the constructor

  toWriteOptions(options) // stamps context.servableTransactionToken + transaction: true
                           // onto `options` - a lower-level escape hatch for call sites
                           // that don't go through an engine-patched write path

  async commit()           // sends every deferred write as ONE real atomic operation.
                            // Base implementation throws "not implemented" - a real
                            // engine must override this.

  async rollback()         // discards whatever was deferred, without sending anything.
                            // Base implementation throws "not implemented" - a real
                            // engine must override this.
}
```

### What a conforming engine implementation must do

1. **Give callers a way to associate a write with a transaction without changing how they call `.save()`/`.destroy()`.** The parse-server engine does this by recognizing `{ transaction: tx }` as a write option and monkey-patching `Parse.Object.prototype.save`/`.destroy`/`Parse.Object.saveAll`/`.destroyAll` to defer instead of sending when `options.transaction` is a live Transaction instance. This is the preferred pattern - `toWriteOptions()` (context-token stamping) is the fallback for engines/call-sites where that kind of interception isn't possible or desirable.
2. **`commit()` must send everything as one real atomic operation against the backing store - never a sequential replay of individual writes.** A sequential replay gives zero atomicity (this was the actual bug in this framework's very first transaction attempt: it deferred writes into a queue but then replayed them one at a time on `commit()`, so a partial failure left partial writes with no rollback - worse than not deferring at all). Whatever primitive the backing store offers for "send N writes as one unit" is what `commit()` should use.
   - The one sanctioned exception is a **detected, logged, opt-out-proof degradation** for a backing store that's confirmed (not guessed) incapable of atomicity right now - e.g. the parse-server engine's standalone-MongoDB fallback (below). This must positively confirm the store's real topology/capability before degrading, must never infer degradation from an error message alone (backing stores commonly sanitize error detail before it reaches the caller), must warn loudly when it happens, and must surface which mode a commit actually ran in (e.g. an outcome `mode` field) so callers who need real atomicity can detect and react to it. Silent, unconditional fallback to sequential replay is still exactly the anti-pattern rule 2 forbids.
3. **v1 scope: reject mixed write kinds within one transaction rather than silently running them non-atomically.** If your backing store's batch primitive only supports one kind of operation per batch (true for Parse Server's `saveAll`/`destroyAll` split), a transaction that's asked to hold both a save and a destroy should throw immediately when the second kind is queued - not commit each kind separately and call it done, since that isn't actually atomic across both.
4. **`rollback()` never needs a compensating action** if nothing was sent until `commit()`. If your engine's implementation of `rollback()` needs to undo something already committed, that's a sign writes are being sent too early somewhere.

### Reference implementation

`@servable/parse-server-engine`'s `src/register/transaction/index.js` is the concrete, tested implementation of this contract for Parse Server - real MongoDB-session-backed atomicity via `Parse.Object.saveAll()`/`destroyAll()` with `{ transaction: true }`, which parse-server wraps in `DatabaseController.createTransactionalSession()` (backed by `MongoStorageAdapter`'s real `session.startTransaction()` - requires the backing MongoDB to be a replica set, same as any Mongo transaction). It's also the reference example for rule 2's degradation exception: `src/register/transaction/detectReplicaSet.js` confirms standalone-vs-replica-set topology directly (rather than trusting the sanitized error `commit()` gets back) before ever falling back to a sequential, non-atomic replay - see that package's `QUICKREF.md` for the full behavior. Read both alongside this doc if you're implementing the contract for a different engine.

## Roadmap

- **Mixed-kind transactions.** The taxonomy's "v1 scope" rule (reject mixed kinds) is deliberately a *current* constraint, not a permanent one - an engine that can build a real atomic combined batch (e.g. Parse Server: one `/batch` request mixing `POST`/`PUT`/`DELETE` sub-requests instead of the separate `saveAll`/`destroyAll` sugar) is free to lift it. When that lands for an engine, this taxonomy doc's "v1 scope" language should be revisited - it may become an engine-capability flag rather than a hard rule for every engine.
- **Other engines.** Only the parse-server engine implements this contract today. Any future engine (a different backend entirely, not just a different Parse Server config) needs its own conforming `Transaction` class - this taxonomy doc plus the parse-server engine's implementation together should be enough context to write one without re-deriving the design from scratch.
