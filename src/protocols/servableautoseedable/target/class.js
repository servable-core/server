
// servableautoseedable adds nothing to what a delete destroys or cascades to (owner's Q1541 a, 2026-11-24). It used to
// name `seeder`, which no class has: a seeder is the source that seeds many objects, shared, so it must never be
// destroyed with one of them. The methods stay so the lists of the protocols below and above it pass through unchanged.
export default ({ ParentClass }) => {
    return class TargetClass extends ParentClass {
        /* #region disposableorphansable */
        disposableOrphans() {
            const items = super.disposableOrphans ? super.disposableOrphans() : []
            return [
                ...items,
            ]
        }
        /* #endregion */

        /* #region disposablechildrenable */
        disposableChildren() {
            const items = super.disposableChildren ? super.disposableChildren() : []
            return [
                ...items,
            ]
        }
        /* #endregion */
    }
}
