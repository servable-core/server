import _ from 'underscore'
const DEFAULT_LIVEQUERY_VERSION = "1.0.0"

export default class LiveQueries {
  _items = []
  get items() { return this._items }
  set items(value) { this._items = value }

  constructor() {

  }

  async register({ liveQuery, feature }) {
    const { id, version = DEFAULT_LIVEQUERY_VERSION } = liveQuery
    const candidate = _.findWhere(this.items, { id, version })
    if (candidate) {
      return
    }

    const _liveQuery = {
      ...liveQuery,
      version: liveQuery.version ? liveQuery.version : DEFAULT_LIVEQUERY_VERSION,
      feature //#TODO: don't retain feature
    }
    this.items.push(_liveQuery)
    const { query, } = _liveQuery

    const _query = await _liveQuery.query()
    const subscription = await _query.subscribe()

    subscription.on('update', (object, original, response) => {
      _liveQuery.onUpdate && _liveQuery.onUpdate({ object, original, response })
    })
    subscription.on('enter', (object, original, response) => {
      _liveQuery.onEnter && _liveQuery.onEnter({ object, original, response })
    })
    subscription.on('open', (response) => {
      _liveQuery.onOpen && _liveQuery.onOpen({ response })
    })
    subscription.on('create', (object, response) => {
      _liveQuery.onCreate && _liveQuery.onCreate({ object, response })
    })
    subscription.on('leave', (object, response) => {
      _liveQuery.onLeave && _liveQuery.onLeave({ object, response })

    })
    subscription.on('delete', (object, response) => {
      _liveQuery.onDelete && _liveQuery.onDelete({ object, response })
    })
    subscription.on('close', () => {
      _liveQuery.onClose && _liveQuery.onClose({})
    })
  }
}
