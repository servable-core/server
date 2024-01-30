import Messaging from "./messaging/index.js"
import Agenda from "agenda"
import Express from './express/index.js'
import Services from './services/index.js'
import { Domain } from '@servable/tools'
// import { Domain } from '../../../../tools/src/index.js'

const { Servable: BaseClass } = Domain

export default class Servable extends BaseClass {
  _express = null
  _schema = null
  _httpServer = null
  _servableConfig = null
  _messaging = null
  _config = {}
  _frameworkBridge = null

  get Services() { return this._services }
  set Services(value) { this._services = value }

  get Messaging() { return this._messaging }
  set Messaging(value) { this._messaging = value }

  get Express() { return this._express }
  set Express(value) { this._express = value }

  get schema() { return this._schema }
  set schema(value) { this._schema = value }

  get Agenda() { return this._agenda }
  set Agenda(value) { this._agenda = value }

  get Config() { return this._config }
  set Config(value) { this._config = value }

  get frameworkBridge() { return this._frameworkBridge }
  set frameworkBridge(value) { this._frameworkBridge = value }

  constructor(props) {
    super(props)
    this.App = {}
  }

  async hydrate({ servableConfig, frameworkBridge, app }) {
    await super.hydrate({ servableConfig, frameworkBridge, app })
    this._servableConfig = servableConfig
    this._messaging = new Messaging()
    this._services = new Services()
    this._agenda = new Agenda()
    this._express = new Express()
    this.frameworkBridge = frameworkBridge
    this.App = await this._frameworkBridge.adaptApp({ servableConfig })

    if (this.App.Route) {
      this.App.Route.Constants = {
        Methods: {
          GET: 'get',
          POST: 'post'
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
    // this.AppNative = await this._frameworkBridge.adaptAppNative({ servableConfig: this.servableConfig })
    this.AppNative = app
  }

  toString() {
    return super.toString()
  }

  get appClass() {
    const { appFeature } = this.schema
    const {
      jsClasses,
      classes: { managed },
    } = appFeature.schema
    const appClass = jsClasses.filter(a => a.name === 'App')
    return appClass[0]
  }

  set appClass(value) { }
}

