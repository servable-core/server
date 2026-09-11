import mongoose from 'mongoose'
const { Schema } = mongoose

// Decision #7 in .docs/technical/unischema-plan.md - a brand-new collection, deliberately not
// the old ParseServerState. That collection (migrationState, migrationsAttempts, protocols
// blob...) is left completely untouched by unischema, not read or written anywhere in this new
// code, so a rollback to the pre-unischema image finds it exactly as it left it.
export default new Schema({
  key: String,
  artifactHash: String,
  appliedAt: { type: Date, default: Date.now },
  // Only ever moves via `servable schema contract` (recorded in servable.schema.json,
  // committed, then persisted here the next time this app boots with that artifact - see
  // functions/recordAppliedArtifact.js). Additive changes never move it.
  compatibilityFloor: { type: Number, default: 0 },
})
