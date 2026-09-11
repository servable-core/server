import prepareModel from './prepareModel.js'

// Called once per boot, after the compatibility-floor check has already passed (see
// launch/start/boot/index.js) - by then the artifact is known-safe to apply, so this is pure
// bookkeeping: record which artifact is now live and, if servable.schema.json's own
// compatibilityFloor is higher than what's stored (a `schema contract` shipped in this
// artifact), raise the stored floor to match. Never lowers it - that would undo a contraction's
// whole point.
//
// This MUST be a single atomic update, not a separate read-then-write (a prior version did
// `findOne` then computed `Math.max` in JS before a second `findOneAndUpdate` call) - two pods
// on different builds can both reach this function within the same narrow window, and a
// read-then-write can regress the floor: if an old, low-floor pod's read happens before a new,
// high-floor pod's write, but the old pod's own write lands *after* it, its stale `Math.max`
// overwrites the just-raised floor back down. Confirmed empirically against a real MongoDB
// (two floors 1 and 0, interleaved so the floor-0 write landed second, regressed the stored
// floor from 1 back to 0) before this fix - see tests/unit/recordAppliedArtifact.test.js.
// The aggregation-pipeline update form of findOneAndUpdate (an array, not a plain object)
// computes `$max` against whatever the document's `compatibilityFloor` actually is *at write
// time*, inside MongoDB, so there is no intervening read to go stale.
export default async ({ databaseURI, key, artifactHash, compatibilityFloor }) => {
  const model = await prepareModel({ databaseURI })

  return model.findOneAndUpdate(
    { key },
    [{
      $set: {
        key,
        artifactHash,
        appliedAt: new Date(),
        compatibilityFloor: { $max: [{ $ifNull: ['$compatibilityFloor', 0] }, compatibilityFloor || 0] },
      },
    }],
    { upsert: true, new: true }
  ).exec()
}
