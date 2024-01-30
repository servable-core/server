import Agenda from 'agenda'

export default class ServableAgenda {
  _instance = null

  constructor(props) {
    const { } = props
    this._instance = new Agenda({
      db: {
        address: process.env.SERVABLE_UTILS_DATABASE_URI
      }
    })
    // this._httpServer = httpServer
    // this._servableConfig = servableConfig
  }

  get instance() { return this._instance }
  set instance(value) { this._instance = value }



  async jobNameForItemAndOperation({ item, name }) {
    if (!item || !name) {
      return null
    }

    return `${item.id}_${name}`
  }

  async jobsForItemAndOperation({ item, name }) {
    if (!item || !name) {
      return null
    }

    const _name = this.jobNameForItemAndOperation({ item, name })
    const jobs = await agenda.jobs({ name: _name })
    return jobs
  }

  async schedule(props) {
    const { item, job, name } = props

    if (!item) {
      return
    }

    !item.isDataAvailable() && await item.fetch({ useMasterKey: true })
    await this.cancelScheduleIfApplicable({ item, name })

    const options = { priority: 'high' }
    const { id } = item

    this.instance.define(name, options, job)

    await this.instance.start()
    await this.instance.schedule(new Date(), name, { id })
  }

  async cancelScheduleIfApplicable({ item, name }) {
    const jobs = await this.jobsForItemAndOperation({ item, name })
    if (!jobs || !jobs.length) {
      return
    }

    const _name = this.jobNameForItemAndOperation({ item, name })
    await this.instance.cancel({ name: _name })
  }
}
