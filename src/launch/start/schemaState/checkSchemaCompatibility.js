import { normalizeArtifact } from '@servable/tools'
import readCommittedArtifact from './readCommittedArtifact.js'
import stateForConfiguration from '../../../lib/utilsDatabase/classes/schemaState/functions/stateForConfiguration.js'
import recordAppliedArtifact from '../../../lib/utilsDatabase/classes/schemaState/functions/recordAppliedArtifact.js'

// Replaces the entire migrate/qualify/MigrationStateEnum machinery - see
// .docs/technical/unischema-plan.md. Two independent checks, either of which can stop boot:
//
// 1. Drift (decision #4, hard-fail in every environment): the artifact this boot's own
//    buildSchema() run would produce right now must match the committed servable.schema.json
//    bit-for-bit. A mismatch means someone edited a protocol's schema.json without running
//    `servable schema build`/`apply` before committing - exactly the mistake this check exists
//    to catch, in dev as much as production, so it isn't discovered for the first time in prod.
//
// 2. Compatibility floor (decisions #1/#7, the actual answer to "pod A on schema n, pod B
//    migrates to n+1, A is left with a mismatched DB"): refuse to boot if THIS pod's own
//    artifact carries a lower compatibilityFloor than what's already recorded in
//    ServableSchemaState - i.e. some other, newer deploy already ran `schema contract` and
//    removed something this pod's code may still expect to exist. Purely additive deploys never
//    move the floor, so this never fires for the overwhelming majority of deploys - it only
//    bites the one case it exists for.
//
// `schemaBuildResult` is launch/index.js's own buildSchema() output, passed straight through -
// normalizeArtifact() is pure (see schema/artifact/index.js), so this never re-runs buildSchema
// a second time just to check drift.
export default async ({ schemaBuildResult, servableConfig }) => {
  const { configuration } = servableConfig
  const databaseURI = configuration?.lock?.databaseURI

  const committed = readCommittedArtifact()
  if (!committed) {
    throw new Error(
      'No servable.schema.json found. Run `servable schema build` and commit the result before deploying - see .docs/technical/unischema-plan.md.'
    )
  }

  const fresh = normalizeArtifact(schemaBuildResult)
  if (fresh.hash !== committed.hash) {
    throw new Error(
      `servable.schema.json is out of date (hash ${committed.hash.slice(0, 12)} committed, ` +
      `${fresh.hash.slice(0, 12)} is what the current protocol sources actually produce). ` +
      `Run \`servable schema build\` and commit the result.`
    )
  }

  const committedFloor = committed.compatibilityFloor || 0
  const stored = await stateForConfiguration({ databaseURI, key: configuration.key })
  const storedFloor = stored?.compatibilityFloor || 0

  if (committedFloor < storedFloor) {
    throw new Error(
      `This build's compatibilityFloor (${committedFloor}) is lower than the database's ` +
      `recorded floor (${storedFloor}) - a newer deploy already ran \`servable schema ` +
      `contract\` and removed something this build's code may still expect. Refusing to boot ` +
      `rather than run against a schema this build doesn't know is missing fields. Rebuild ` +
      `from the current sources.`
    )
  }

  await recordAppliedArtifact({
    databaseURI,
    key: configuration.key,
    artifactHash: committed.hash,
    compatibilityFloor: committedFloor,
  })

  return { artifact: committed }
}
