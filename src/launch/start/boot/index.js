import checkSchemaCompatibility from '../schemaState/checkSchemaCompatibility.js'
import quit from './quit.js'

// Replaces qualify.js + migrate/ + migrationsPayload/ - see .docs/technical/unischema-plan.md.
// No more MigrationStateEnum, no more per-pod "should I be the one to migrate" coordination:
// checkSchemaCompatibility() either says this build is safe to boot (drift-free, floor-
// compatible) or throws, and engine.launch() always applies the full schema additively - see
// that function's own comment for why the migrate/no-migrate distinction no longer exists
// either. quit() is kept only for this one remaining failure path (an incompatible/stale build
// trying to boot in production) - it no longer has a "someone else is migrating, retry" case to
// also cover, since there is no longer anything to wait out.
export default async ({ servableConfig, app, schema, engine }) => {
  const { configuration } = servableConfig

  try {
    await checkSchemaCompatibility({ schemaBuildResult: schema, servableConfig })
  } catch (error) {
    console.error('[SERVABLE]', '[DEBUG]', 'boot> schema compatibility check failed', error.message)
    quit({ delay: 0, error })
    return null
  }

  const result = await engine.launch({ app, schema, configuration })

  return {
    ...result,
    schema,
    configuration,
  }
}
