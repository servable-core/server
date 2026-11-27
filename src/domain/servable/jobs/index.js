// Servable.App.Jobs: the jobs this app registered, kept by their id, and a way to run one now (job-run door design,
// .docs/technical/job-run-door-design.md, owner's Q431 a and Q435 a, 2026-11-27).
//
// The engine schedules each job (one Agenda instance per job today, engines/parse-server/src/register/jobs/index.js) and keeps
// no copy of it, so nothing in a running app could find a job by its id. This contract records every descriptor before handing
// it to the engine, and hands the engine a handler wrapped in the job's lock, so the scheduled run and a run now never overlap.
//
// The lock is the app's: `servableConfig.jobs.lock({ key, ttlSeconds, operation })` answers `{ isAcquired, result }`. Without
// it a job runs unlocked, as before, which keeps every other Servable app as it is. The engine is unchanged: it is given the
// wrapped handler and schedules it as before; Agenda ignores what a handler returns.

export const JOB_RUN_REFUSAL_CODES = Object.freeze({
  jobNotFound: 'jobNotFound',
  jobIsRunning: 'jobIsRunning',
  paramsNotSupported: 'paramsNotSupported',
  dryRunNotSupported: 'dryRunNotSupported',
  asOfNotSupported: 'asOfNotSupported',
  asOfNotADate: 'asOfNotADate',
})

// A job's lock lasts this long unless its descriptor says otherwise (`lockTtlSeconds`): long enough for the jobs that run for
// minutes, short enough that a crashed run frees the job before its next tick.
export const DEFAULT_JOB_LOCK_TTL_SECONDS = 15 * 60

const lockKeyOfJob = (id) => `servable:job:${id}`

const namesOfParams = (params) => (params && typeof params === 'object' ? Object.keys(params) : [])

// What a run now asks of a job, checked against what the job's descriptor declares it accepts: a job never runs on everything
// when its caller believed it scoped the run.
/**
 * @param {{ descriptor: object, params?: Record<string, unknown>, asOf?: string | Date | null, isDryRun?: boolean }} request
 * @returns {object | null} the refusal, or null when the job accepts the run
 */
export const refusalOfARunNow = ({ descriptor, params, asOf, isDryRun }) => {
  const acceptedParamNames = Array.isArray(descriptor.runNowParams) ? descriptor.runNowParams : []
  const unsupportedParamNames = namesOfParams(params).filter((name) => !acceptedParamNames.includes(name))
  if (unsupportedParamNames.length) {
    return {
      refusalCode: JOB_RUN_REFUSAL_CODES.paramsNotSupported,
      message: `The job ${descriptor.id} does not accept ${unsupportedParamNames.join(', ')}.`,
      unsupportedParamNames,
      acceptedParamNames,
    }
  }
  if (isDryRun === true && descriptor.isDryRunSupported !== true) {
    return { refusalCode: JOB_RUN_REFUSAL_CODES.dryRunNotSupported, message: `The job ${descriptor.id} cannot be dry-run.` }
  }
  if (asOf !== undefined && asOf !== null) {
    if (descriptor.isAsOfSupported !== true) {
      return { refusalCode: JOB_RUN_REFUSAL_CODES.asOfNotSupported, message: `The job ${descriptor.id} does not take a date to run as of.` }
    }
    if (Number.isNaN(new Date(asOf).getTime())) {
      return { refusalCode: JOB_RUN_REFUSAL_CODES.asOfNotADate, message: 'asOf is not a date.' }
    }
  }
  return null
}

// The job handed to a handler by a run now: shaped like Agenda's (`attrs.name`, `attrs.data`), plus `runNow`, which a
// scheduled run never carries. A handler reads `job?.runNow?.params`, `job?.runNow?.asOf` and `job?.runNow?.isDryRun`.
const jobOfARunNow = ({ descriptor, params, asOf, isDryRun }) => ({
  attrs: { name: descriptor.id, data: { id: descriptor.id, ...(descriptor.attributes || {}) } },
  runNow: {
    params: params || {},
    asOf: asOf === undefined || asOf === null ? null : new Date(asOf),
    isDryRun: isDryRun === true,
  },
})

/**
 * @param {{ engineJobs?: { define?: Function } | null, lockOfJobs?: () => Function | null | undefined }} [options]
 * @returns {{ define: Function, findJob: Function, listJobIds: Function, runNow: Function }} Servable.App.Jobs
 */
export const createJobsContract = ({ engineJobs = null, lockOfJobs = () => null } = {}) => {
  const descriptorsById = new Map()

  // Runs one of the job's runs under its lock. `isAcquired: false` means another run of the job holds it.
  const runUnderTheJobLock = async ({ descriptor, operation }) => {
    const lock = lockOfJobs()
    if (typeof lock !== 'function') {
      return { isAcquired: true, result: await operation() }
    }
    const ttlSeconds = Number(descriptor.lockTtlSeconds) > 0 ? Number(descriptor.lockTtlSeconds) : DEFAULT_JOB_LOCK_TTL_SECONDS
    const answer = await lock({ key: lockKeyOfJob(descriptor.id), ttlSeconds, operation })
    return { isAcquired: answer?.isAcquired === true, result: answer?.result }
  }

  // The handler the engine schedules: the job's own, under the job's lock. A tick that finds the job running skips it,
  // as Agenda's own lock already makes a tick do across processes.
  const scheduledHandlerOf = (descriptor) => async (job) => {
    const { isAcquired, result } = await runUnderTheJobLock({ descriptor, operation: () => descriptor.handler(job) })
    if (!isAcquired) {
      console.info(`[Servable] job ${descriptor.id}: already running, this scheduled run is skipped`)
    }
    return result
  }

  const define = async (descriptor) => {
    if (!descriptor || !descriptor.id || typeof descriptor.handler !== 'function') {
      console.error('[Servable] a job needs an id and a handler, it is not registered', descriptor?.id)
      return
    }
    if (descriptorsById.has(descriptor.id)) {
      console.error(`[Servable] job ${descriptor.id} is registered twice; the first one is kept`)
      return
    }
    descriptorsById.set(descriptor.id, descriptor)
    if (engineJobs && typeof engineJobs.define === 'function') {
      await engineJobs.define({ ...descriptor, handler: scheduledHandlerOf(descriptor) })
    }
  }

  const findJob = (id) => descriptorsById.get(id) || null

  const listJobIds = () => [...descriptorsById.keys()].sort()

  /**
   * Runs a registered job once, now, in this process, and answers what it did. Never throws for a refusal or for the
   * job's own failure: the caller (an app's door) turns each answer into its response.
   * @param {{ id?: string, params?: Record<string, unknown>, asOf?: string | Date | null, isDryRun?: boolean }} [request]
   * @returns {Promise<object>} `{ hasRun: false, refusalCode, message }`, or `{ hasRun: true, hasFailed, errorMessage, result, ... }`
   */
  const runNow = async ({ id, params, asOf, isDryRun } = {}) => {
    const descriptor = findJob(id)
    if (!descriptor) {
      return { hasRun: false, refusalCode: JOB_RUN_REFUSAL_CODES.jobNotFound, message: `No job is registered as ${id}.` }
    }
    const refusal = refusalOfARunNow({ descriptor, params, asOf, isDryRun })
    if (refusal) {
      return { hasRun: false, ...refusal }
    }

    const job = jobOfARunNow({ descriptor, params, asOf, isDryRun })
    const startedAt = new Date()
    let hasFailed = false
    let errorMessage = null
    const { isAcquired, result } = await runUnderTheJobLock({
      descriptor,
      operation: async () => {
        try {
          return await descriptor.handler(job)
        } catch (error) {
          hasFailed = true
          errorMessage = error?.message || String(error)
          return undefined
        }
      },
    })
    if (!isAcquired) {
      return { hasRun: false, refusalCode: JOB_RUN_REFUSAL_CODES.jobIsRunning, message: `The job ${id} is running already.`, isRetryable: true }
    }
    const finishedAt = new Date()
    return {
      hasRun: true,
      hasFailed,
      errorMessage,
      id,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      asOf: job.runNow.asOf,
      isDryRun: job.runNow.isDryRun,
      result: result === undefined ? null : result,
    }
  }

  return { define, findJob, listJobIds, runNow }
}

export default createJobsContract
