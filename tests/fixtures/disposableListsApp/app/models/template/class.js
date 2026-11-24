// The app's own class names one orphan and one child of its own, as methods calling super.
export default class Template extends Servable.App.Object {
  constructor() {
    super('Template')
  }

  disposableOrphans() {
    const items = super.disposableOrphans ? super.disposableOrphans() : []
    return [...items, 'templateOrphan']
  }

  disposableChildren() {
    const items = super.disposableChildren ? super.disposableChildren() : []
    return [...items, 'templateChild']
  }
}
