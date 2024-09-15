import Agenda from "agenda"
import Express from './express/index.js'
import Services from './services/index.js'
import LiveQueries from './livequeries/index.js'
import { Domain } from '@servable/tools'
// import { Domain } from '../../../../tools/src/index.js'

const { Servable: BaseClass } = Domain

export default class Servable extends BaseClass {
  _express = null
  _schema = null
  _httpServer = null
  _servableConfig = null
  _config = {}
  _engine = null

  get Services() { return this._services }
  set Services(value) { this._services = value }

  get LiveQueries() { return this._liveQueries }
  set LiveQueries(value) { this._liveQueries = value }

  get Express() { return this._express }
  set Express(value) { this._express = value }

  get schema() { return this._schema }
  set schema(value) { this._schema = value }

  get Agenda() { return this._agenda }
  set Agenda(value) { this._agenda = value }

  get Config() { return this._config }
  set Config(value) { this._config = value }

  get ServableConfig() { return this._servableConfig }
  set ServableConfig(value) { this._servableConfig = value }

  get engine() { return this._engine }
  set engine(value) { this._engine = value }

  constructor(props) {
    super(props)
    this.App = {}
  }

  async hydrate({ servableConfig, engine, app }) {
    await super.hydrate({ servableConfig, engine, app })
    this._servableConfig = servableConfig
    this._services = new Services()
    this._liveQueries = new LiveQueries()
    this._agenda = new Agenda()
    this._express = new Express()
    this.engine = engine
    this.App = await this._engine.adaptApp({ servableConfig })
    this.Console = console

    if (this.App.Route) {
      this.App.Route.Constants = {
        Methods: {
          GET: 'get',
          POST: 'post',
          PUT: 'put',
          DELETE: 'delete',
          OPTIONS: 'options',
        },
        RateLimiting: {
          Type: {
            FixedByIp: 'fixed-by-ip'
          }
        },
        Cache: {
          Type: {
            InMemory: 'memory'
          }
        }
      }
    }
    // this.AppNative = await this._engine.adaptAppNative({ servableConfig: this.servableConfig })
    this.AppNative = app
  }
}

