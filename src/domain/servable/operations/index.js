import PQueue from 'p-queue';

export default class Operations {
  _throttleGroups = []
  get throttleGroups() { return this._throttleGroups }
  set throttleGroups(value) { this._throttleGroups = value }

  constructor() {

  }

  /**
   * @param {object} props
   * @param {string} [props.id] - accepted for parity with `execute()`'s call shape; unused -
   *   the actual throttle-group identity comes from `throttle.groupName`.
   * @param {{ groupName: string, maxConcurrent: number, minTime?: number }} props.throttle
   * @param {() => any} props.operation
   */
  async executeThrottle({
    id,
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

  // Found via checkJs (lucide, PEAKUB DX initiative): this class used to declare a second,
  // earlier `execute({ throttle })` above - an empty stub that JS class semantics let this one
  // silently shadow (the last declaration of a given method name always wins; the first was
  // 100% dead, never callable). Removed rather than kept, since there was nothing to preserve.
  /**
   * @param {object} props
   * @param {string} [props.id] - forwarded to `executeThrottle` (and the Jobs cron path) as
   *   the throttle-group/job identity; unused otherwise.
   * @param {{ groupName: string, maxConcurrent: number, minTime?: number }} [props.throttle] -
   *   run `operation` through a named, concurrency-limited queue instead of immediately.
   * @param {string} [props.cron] - a cron expression; if set, `operation` is scheduled via
   *   `Servable.App.Jobs.define()` instead of run inline.
   * @param {() => any} props.operation - the work to run (or throttle/schedule).
   */
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
