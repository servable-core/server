import PQueue from 'p-queue';

export default class Operations {
  _throttleGroups = []
  get throttleGroups() { return this._throttleGroups }
  set throttleGroups(value) { this._throttleGroups = value }

  constructor() {

  }

  async execute({
    throttle,
  }) {

  }

  async executeThrottle({
    throttle,
    operation,
  }) {

    const {
      groupName,
      maxConcurrent,
      minTime,
    } = throttle

    if (!this.throttleGroups[groupName]) {
      this.throttleGroups[groupName] =
        new PQueue({ concurrency: maxConcurrent })
    }

    return this.throttleGroups[groupName].add(operation)
  }

  async execute({
    id,
    throttle,
    cron,
    operation,
  }) {

    if (throttle) {
      return this.executeThrottle({
        id,
        throttle,
        operation
      })
    }

    if (cron) {
      Servable.App.Jobs.define({
        id,
        handler: operation,
        cron
      })
    }

    return operation()
  }
}
