
export default ({ ParentClass }) => {
    return class TargetClass extends ParentClass {
        disposableOrphans() {
            const items = super.disposableOrphans ? super.disposableOrphans() : []
            return [
                ...items,
                'seeder'
            ]
        }

        /* #region disposablechildrenable */
        disposableChildren() {
            const items = super.disposableChildren ? super.disposableChildren() : []
            return [
                ...items,
                'seeder'
            ]
        }
        /* #endregion */
    }
}