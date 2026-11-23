// Servable.App.Indexes taxonomy - the contract an engine's own index maker conforms to, and the fallback
// @servable/server wires in when an engine provides none (see ../index.js `hydrate()`), so `Servable.App.Indexes`
// is never undefined: an app or a protocol can always ask, and an engine that cannot make indexes says so.
//
// Contract:
// - `ensure({ className, name, keys, isUnique, isSparse, partialFilter, fieldTypes })` makes one index of a class
//   when it is not there yet, under `name`, with `keys` named as the app names its fields (`objectId`, a pointer by
//   its own name, a dotted path into an object) and ordered: `{ field: 1 | -1 }`. `isUnique` false by default;
//   `isSparse` (rows without the field left out) true by default, never with a `partialFilter` (only the rows
//   matching it, fields named as in `keys`); `fieldTypes` gives the type of a field the class's schema does not
//   declare (`{ type: 'Pointer', targetClass }`).
// - It is idempotent (an index already there, identical, is left as it is) and never throws: it answers
//   `{ isEnsured, className, name, reason? }`, `reason` saying in words why an index was not made (a clash with
//   an index already there, duplicates where it should be unique, a malformed declaration, an engine that cannot).
// - It never drops an index.
// - Callers at boot never await it: an index build must never hold a boot.
// The same declarations can be written in a schema.json (`ensuredIndexes`, see @servable/tools'
// schema/ensuredIndexes.js); the engine then makes them after boot, through this same contract.
export const IndexesContract = {
  /**
   * @param {object} props
   * @param {string} props.className
   * @param {string} props.name
   * @param {Record<string, 1 | -1>} props.keys
   * @param {boolean} [props.isUnique]
   * @param {boolean} [props.isSparse]
   * @param {Record<string, any>} [props.partialFilter]
   * @param {Record<string, any>} [props.fieldTypes]
   * @returns {Promise<{ isEnsured: boolean, className: string, name: string, reason?: string }>}
   */
  ensure: async (props) => {
    const { className, name } = props
    const reason = 'this engine cannot make indexes (Servable.App.Indexes is not implemented by it)'
    console.error('[SERVABLE]', '[indexes]', 'not made', { className, name, reason })
    return { isEnsured: false, className, name, reason }
  },
}

export default IndexesContract
