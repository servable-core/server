import mongoose from 'mongoose'

// Integration test, not a unit test - deliberately talks to a real MongoDB rather than mocking
// mongoose, because the thing being verified is MongoDB's own atomic aggregation-pipeline-update
// behavior under concurrent writes. A mock can only assert "we called findOneAndUpdate with this
// argument shape" - it can't prove the race is actually gone, which is the entire point of this
// file (see the fix's own comment in recordAppliedArtifact.js for how this was first found).
//
// Uses whatever local dev MongoDB is already running (SERVABLE_TEST_DATABASE_URI, defaulting to
// the same scratch container/credentials `app/system/docker/docker-compose.yaml` brings up for
// backend/main's own engine database) - never spins up its own container and never calls
// @servable/server's launch()/launchSystem (that triggers a full docker-compose recreation of
// shared local dev infra - see this repo's CLAUDE.md "Testing gotcha" for why that's avoided).
// Writes go to a throwaway collection with keys unique to this test file, cleaned up in
// beforeEach/afterAll, and skip entirely (not fail) if no MongoDB is reachable, so a dev without
// the local stack running doesn't get a broken `yarn test`.
const TEST_URI = process.env.SERVABLE_TEST_DATABASE_URI
  || 'mongodb://root:DATABASE_PASSWORD_TO_CHANGE@127.0.0.1:27018/servable-schemastate-test?authSource=admin'

let mongoReachable = true
try {
  await mongoose.createConnection(TEST_URI).asPromise().then(c => c.close())
} catch (e) {
  mongoReachable = false
}

const describeIfMongo = mongoReachable ? describe : describe.skip

describeIfMongo('recordAppliedArtifact - concurrent-write race (real MongoDB)', () => {
  let connection
  let Model
  const { Schema } = mongoose

  beforeAll(async () => {
    connection = await mongoose.createConnection(TEST_URI).asPromise()
    Model = connection.model('RecordAppliedArtifactRaceTest', new Schema({
      key: String,
      artifactHash: String,
      appliedAt: { type: Date, default: Date.now },
      compatibilityFloor: { type: Number, default: 0 },
    }), 'servable_schema_state_race_test')
  })

  afterAll(async () => {
    if (Model) await Model.deleteMany({ key: /^race-test/ })
    if (connection) await connection.close()
  })

  beforeEach(async () => {
    await Model.deleteMany({ key: /^race-test/ })
  })

  // The exact function under test, reimplemented against the *test's own* connection/model
  // instead of importing recordAppliedArtifact.js directly - that file resolves its model via
  // prepareModel.js -> db/client.js's shared `mongoose.connect()` singleton, which this test
  // deliberately doesn't touch, to avoid interfering with any other test or process sharing that
  // global mongoose connection. The update document is copied verbatim from the real file - if
  // that file's pipeline shape changes, this test and the real fix will drift, which is an
  // acceptable trade-off for not sharing global connection state in a test suite.
  const recordAppliedArtifact = ({ key, artifactHash, compatibilityFloor }) => Model.findOneAndUpdate(
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

  test('same-build concurrent boots converge on the same floor regardless of write order', async () => {
    await Promise.all([
      recordAppliedArtifact({ key: 'race-test-same-build', artifactHash: 'H2', compatibilityFloor: 0 }),
      recordAppliedArtifact({ key: 'race-test-same-build', artifactHash: 'H2', compatibilityFloor: 0 }),
    ])
    const doc = await Model.findOne({ key: 'race-test-same-build' }).exec()
    expect(doc.compatibilityFloor).toBe(0)
  })

  test('cross-build race never lets a lower-floor pod\'s write regress an already-raised floor', async () => {
    // Simulates: pod A (a `schema contract` deploy, floor 1) and pod B (an old pod on floor 0,
    // e.g. mid-restart) both pass their own compatibility check before either has written -
    // then A's write lands, then B's write lands after it. This exact interleaving regressed the
    // stored floor from 1 back to 0 under the old read-then-write implementation - see
    // recordAppliedArtifact.js's own comment and this test's presence for why it can't regress.
    await recordAppliedArtifact({ key: 'race-test-cross-build', artifactHash: 'hA', compatibilityFloor: 1 })
    await recordAppliedArtifact({ key: 'race-test-cross-build', artifactHash: 'hB', compatibilityFloor: 0 })

    const doc = await Model.findOne({ key: 'race-test-cross-build' }).exec()
    expect(doc.compatibilityFloor).toBe(1)
  })

  test('floor still rises correctly when the higher-floor write lands second (no race involved)', async () => {
    await recordAppliedArtifact({ key: 'race-test-ordinary-bump', artifactHash: 'hOld', compatibilityFloor: 0 })
    await recordAppliedArtifact({ key: 'race-test-ordinary-bump', artifactHash: 'hNew', compatibilityFloor: 1 })

    const doc = await Model.findOne({ key: 'race-test-ordinary-bump' }).exec()
    expect(doc.compatibilityFloor).toBe(1)
  })

  test('first-ever write for a key upserts correctly with no prior document', async () => {
    const doc = await recordAppliedArtifact({ key: 'race-test-first-write', artifactHash: 'h1', compatibilityFloor: 0 })
    expect(doc.compatibilityFloor).toBe(0)
    expect(doc.artifactHash).toBe('h1')
  })
})
