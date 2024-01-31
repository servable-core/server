import cacheFn from './cache/index.js'

export default class ServableExpress {
  _app = null
  _cache = cacheFn

  constructor() {

  }

  get app() { return this._app }
  set app(value) { this._app = value }

  get cache() { return this._cache }
  set cache(value) { this._cache = value }
}
