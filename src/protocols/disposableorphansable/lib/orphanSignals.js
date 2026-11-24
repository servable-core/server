import { serverMetrics } from '../../../lib/proof/serverMetrics.js'

// Production proof of the orphans' fix (owner's Q1580 a, 2026-11-24; .docs/incidents/2026-11-24-boot-index-drops.md, side finding
// Q1482 a): `disposableOrphans` declared as a class field hid the publishable protocol's method, so this protocol's afterDelete
// found nothing to destroy and 268 rows outlived their parents. Fixed by declaring the lists as methods (02c9179) and by reading a
// Relation's rows with the master key (4d080a8); these counts prove the deletes now happen, and say when one fails:
//   servable_orphans_destroyed_total{class_name, field}        rows (or files) destroyed after their parent was deleted
//   servable_orphans_destroy_failed_total{class_name, field}   rows (or files) whose destroy threw: the row outlives its parent
// `class_name` is the deleted parent's class, `field` the orphan field its `disposableOrphans()` names: both from the schema, a
// closed list. Never an object's id.

/**
 * Counts what one orphan field's handling destroyed and failed to destroy. Never throws.
 * @param {{ className?: string, field: string, destroyed?: number, failed?: number }} props
 */
export const recordTheOrphansHandled = ({ className, field, destroyed = 0, failed = 0 }) => {
  try {
    const attributes = { class_name: className || 'unknown', field: `${field}` }
    if (destroyed > 0) {
      serverMetrics().counter('servable_orphans_destroyed_total', {
        description: 'Count of rows or files destroyed by disposableorphansable after their parent was deleted, by parent class and orphan field.',
      }).add(destroyed, attributes)
    }
    if (failed > 0) {
      serverMetrics().counter('servable_orphans_destroy_failed_total', {
        description: 'Count of rows or files disposableorphansable failed to destroy after their parent was deleted (they outlive it), by parent class and orphan field.',
      }).add(failed, attributes)
    }
  } catch {
    // A count never fails a delete.
  }
}
