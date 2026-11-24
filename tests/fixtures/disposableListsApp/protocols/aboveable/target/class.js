// A protocol whose target class sits above the class it is attached to, as the publishable protocol does in an app:
// it adds a name of its own to each list and calls super for the rest.
export default ({ ParentClass }) => {
    return class AboveableTargetClass extends ParentClass {
        disposableOrphans() {
            const items = super.disposableOrphans ? super.disposableOrphans() : []
            return [...items, 'aboveableOrphan']
        }

        disposableChildren() {
            const items = super.disposableChildren ? super.disposableChildren() : []
            return [...items, 'aboveableChild']
        }
    }
}
