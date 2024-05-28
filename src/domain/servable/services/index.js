import _ from 'underscore'
const DEFAULT_SERVICE_VERSION = "1.0.0"

export default class Intercom {
  _items = []
  get items() { return this._items }
  set items(value) { this._items = value }

  constructor() {

  }

  async register({ service, feature }) {
    const { id, version = DEFAULT_SERVICE_VERSION } = service
    const candidate = _.findWhere(this.items, { id, version })
    if (candidate) {
      return
    }
    const _service = {
      ...service,
      version: service.version ? service.version : DEFAULT_SERVICE_VERSION,
      feature //#TODO: don't retain feature
    }
    this.items.push(_service)
    await _service.register({ feature })
  }


  async call({
    id,
    version = DEFAULT_SERVICE_VERSION,
    params,
  }) {
    const service = _.findWhere(this.items, { id, version })
    if (!service) {
      return new Error("Could not find designated service.")
    }

    //#TODO: don't retain feature
    return service.handler({ params, feature: service.feature })
  }
}
