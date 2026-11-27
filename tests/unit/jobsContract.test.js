import { jest } from '@jest/globals'
import { createJobsContract, JOB_RUN_REFUSAL_CODES, DEFAULT_JOB_LOCK_TTL_SECONDS } from '../../src/domain/servable/jobs/index.js'

// Servable.App.Jobs (job-run door design, 2026-11-27): the jobs an app registered, found by their id, run now under the same
// lock as their scheduled run, refusing what a job does not declare it accepts.

// A lock shaped like an app's (backend/main's withLock with isSkippedWhenBusy): one holder per key, never waiting.
const createInMemoryLock = () => {
  const heldKeys = new Set()
  const calls = []
  const lock = async ({ key, ttlSeconds, operation }) => {
    calls.push({ key, ttlSeconds })
    if (heldKeys.has(key)) {
      return { isAcquired: false }
    }
    heldKeys.add(key)
    try {
      return { isAcquired: true, result: await operation() }
    } finally {
      heldKeys.delete(key)
    }
  }
  return { lock, calls, heldKeys }
}

const createEngineJobs = () => {
  const definedById = new Map()
  return { define: jest.fn(async (descriptor) => { definedById.set(descriptor.id, descriptor) }), definedById }
}

describe('Servable.App.Jobs', () => {
  test('a registered job is found by its id, and the engine is given it to schedule', async () => {
    const engineJobs = createEngineJobs()
    const jobs = createJobsContract({ engineJobs })
    await jobs.define({ id: 'settle', cron: '23 * * * *', handler: async () => ({ settledCount: 2 }) })

    expect(jobs.findJob('settle').cron).toBe('23 * * * *')
    expect(jobs.listJobIds()).toEqual(['settle'])
    expect(engineJobs.define).toHaveBeenCalledTimes(1)
    expect(engineJobs.definedById.get('settle').cron).toBe('23 * * * *')
  })

  test('the engine schedules a wrapped handler that still runs the job and returns its answer', async () => {
    const engineJobs = createEngineJobs()
    const handler = jest.fn(async () => ({ settledCount: 1 }))
    const jobs = createJobsContract({ engineJobs })
    await jobs.define({ id: 'settle', cron: '* * * * *', handler })

    const scheduledHandler = engineJobs.definedById.get('settle').handler
    expect(scheduledHandler).not.toBe(handler)
    await expect(scheduledHandler({ attrs: { name: 'settle' } })).resolves.toEqual({ settledCount: 1 })
    expect(handler).toHaveBeenCalledWith({ attrs: { name: 'settle' } })
  })

  test('a job with no id or no handler is not registered, and a second job of one id keeps the first', async () => {
    const jobs = createJobsContract({})
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await jobs.define({ cron: '* * * * *', handler: async () => {} })
    await jobs.define({ id: 'noHandler', cron: '* * * * *' })
    await jobs.define({ id: 'a', handler: async () => 'first' })
    await jobs.define({ id: 'a', handler: async () => 'second' })
    errorSpy.mockRestore()

    expect(jobs.listJobIds()).toEqual(['a'])
    await expect(jobs.runNow({ id: 'a' })).resolves.toMatchObject({ hasRun: true, result: 'first' })
  })

  test('runNow returns what the handler returns, with when it ran', async () => {
    const jobs = createJobsContract({})
    await jobs.define({ id: 'settle', handler: async () => ({ settledCount: 3 }) })

    const answer = await jobs.runNow({ id: 'settle' })
    expect(answer).toMatchObject({ hasRun: true, hasFailed: false, id: 'settle', isDryRun: false, asOf: null, result: { settledCount: 3 } })
    expect(answer.finishedAt.getTime()).toBeGreaterThanOrEqual(answer.startedAt.getTime())
    expect(answer.durationMs).toBeGreaterThanOrEqual(0)
  })

  test('a handler that returns nothing answers a null result', async () => {
    const jobs = createJobsContract({})
    await jobs.define({ id: 'quiet', handler: async () => {} })
    await expect(jobs.runNow({ id: 'quiet' })).resolves.toMatchObject({ hasRun: true, result: null })
  })

  test('an unknown id is refused as jobNotFound', async () => {
    const jobs = createJobsContract({})
    await expect(jobs.runNow({ id: 'nothing' })).resolves.toMatchObject({ hasRun: false, refusalCode: JOB_RUN_REFUSAL_CODES.jobNotFound })
  })

  test('a handler that throws answers hasFailed with its message, and never throws itself', async () => {
    const jobs = createJobsContract({})
    await jobs.define({ id: 'broken', handler: async () => { throw new Error('finak did not answer') } })
    await expect(jobs.runNow({ id: 'broken' })).resolves.toMatchObject({ hasRun: true, hasFailed: true, errorMessage: 'finak did not answer' })
  })

  test('the handler of a run now is given the params, the date and the dry run, which a scheduled run never carries', async () => {
    const handler = jest.fn(async (job) => job.runNow)
    const jobs = createJobsContract({})
    await jobs.define({ id: 'settle', handler, runNowParams: ['publicationId'], isDryRunSupported: true, isAsOfSupported: true, attributes: { kind: 'money' } })

    const answer = await jobs.runNow({ id: 'settle', params: { publicationId: 'p1' }, asOf: '2026-12-01T06:41:00Z', isDryRun: true })
    expect(answer.result).toEqual({ params: { publicationId: 'p1' }, asOf: new Date('2026-12-01T06:41:00Z'), isDryRun: true })
    expect(handler.mock.calls[0][0].attrs).toEqual({ name: 'settle', data: { id: 'settle', kind: 'money' } })
    expect(answer.asOf).toEqual(new Date('2026-12-01T06:41:00Z'))
    expect(answer.isDryRun).toBe(true)
  })

  test('params, a dry run or a date the job does not declare are refused, and the job does not run', async () => {
    const handler = jest.fn(async () => 'ran')
    const jobs = createJobsContract({})
    await jobs.define({ id: 'settle', handler, runNowParams: ['publicationId'] })

    await expect(jobs.runNow({ id: 'settle', params: { walletId: 'w1' } })).resolves.toMatchObject({
      hasRun: false, refusalCode: JOB_RUN_REFUSAL_CODES.paramsNotSupported, unsupportedParamNames: ['walletId'], acceptedParamNames: ['publicationId'],
    })
    await expect(jobs.runNow({ id: 'settle', isDryRun: true })).resolves.toMatchObject({ hasRun: false, refusalCode: JOB_RUN_REFUSAL_CODES.dryRunNotSupported })
    await expect(jobs.runNow({ id: 'settle', asOf: '2026-12-01' })).resolves.toMatchObject({ hasRun: false, refusalCode: JOB_RUN_REFUSAL_CODES.asOfNotSupported })
    expect(handler).not.toHaveBeenCalled()
  })

  test('a date that is not one is refused', async () => {
    const jobs = createJobsContract({})
    await jobs.define({ id: 'settle', handler: async () => 'ran', isAsOfSupported: true })
    await expect(jobs.runNow({ id: 'settle', asOf: 'tomorrow' })).resolves.toMatchObject({ hasRun: false, refusalCode: JOB_RUN_REFUSAL_CODES.asOfNotADate })
  })

  test('without a lock from the app, a job runs unlocked, as before', async () => {
    const jobs = createJobsContract({ lockOfJobs: () => undefined })
    await jobs.define({ id: 'settle', handler: async () => 'ran' })
    await expect(jobs.runNow({ id: 'settle' })).resolves.toMatchObject({ hasRun: true, result: 'ran' })
  })

  test('the lock is asked by the job id, for the default lifetime or the job\'s own', async () => {
    const { lock, calls } = createInMemoryLock()
    const jobs = createJobsContract({ lockOfJobs: () => lock })
    await jobs.define({ id: 'settle', handler: async () => 'ran' })
    await jobs.define({ id: 'digest', handler: async () => 'ran', lockTtlSeconds: 120 })
    await jobs.runNow({ id: 'settle' })
    await jobs.runNow({ id: 'digest' })
    expect(calls).toEqual([
      { key: 'servable:job:settle', ttlSeconds: DEFAULT_JOB_LOCK_TTL_SECONDS },
      { key: 'servable:job:digest', ttlSeconds: 120 },
    ])
  })

  test('a run now while the job runs answers jobIsRunning, and a scheduled tick while it runs skips', async () => {
    const { lock } = createInMemoryLock()
    const engineJobs = createEngineJobs()
    let releaseTheRun
    const handler = jest.fn(() => new Promise((resolve) => { releaseTheRun = () => resolve('done') }))
    const jobs = createJobsContract({ engineJobs, lockOfJobs: () => lock })
    await jobs.define({ id: 'settle', handler })
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})

    const firstRun = jobs.runNow({ id: 'settle' })
    await new Promise((resolve) => setImmediate(resolve))
    await expect(jobs.runNow({ id: 'settle' })).resolves.toMatchObject({ hasRun: false, refusalCode: JOB_RUN_REFUSAL_CODES.jobIsRunning, isRetryable: true })
    await expect(engineJobs.definedById.get('settle').handler({ attrs: {} })).resolves.toBeUndefined()
    releaseTheRun()
    await expect(firstRun).resolves.toMatchObject({ hasRun: true, result: 'done' })
    infoSpy.mockRestore()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  // Property (60 runs, seeded): scheduled ticks and runs now of a few jobs, started at random moments and lasting random
  // times. A job never runs twice at once; every run now either ran or answered jobIsRunning; every tick either ran or skipped.
  test('property: a job never runs twice at once, whatever the order of ticks and runs now', async () => {
    let seed = 20261127
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})

    for (let run = 0; run < 60; run += 1) {
      const { lock } = createInMemoryLock()
      const engineJobs = createEngineJobs()
      const jobs = createJobsContract({ engineJobs, lockOfJobs: () => lock })
      const jobIds = ['a', 'b', 'c'].slice(0, 1 + Math.floor(random() * 3))
      const runningCountById = {}
      const ranCountById = {}
      for (const id of jobIds) {
        runningCountById[id] = 0
        ranCountById[id] = 0
        await jobs.define({
          id,
          handler: async () => {
            runningCountById[id] += 1
            expect(runningCountById[id]).toBe(1)
            await sleep(Math.floor(random() * 4))
            runningCountById[id] -= 1
            ranCountById[id] += 1
            return 'ran'
          },
        })
      }

      const attempts = []
      const attemptCount = 3 + Math.floor(random() * 8)
      for (let index = 0; index < attemptCount; index += 1) {
        const id = jobIds[Math.floor(random() * jobIds.length)]
        const isRunNow = random() < 0.5
        const delay = Math.floor(random() * 4)
        attempts.push((async () => {
          await sleep(delay)
          if (isRunNow) {
            const answer = await jobs.runNow({ id })
            return { id, isRunNow, hasRun: answer.hasRun, refusalCode: answer.refusalCode }
          }
          const result = await engineJobs.definedById.get(id).handler({ attrs: { name: id } })
          return { id, isRunNow, hasRun: result === 'ran' }
        })())
      }
      const outcomes = await Promise.all(attempts)

      for (const outcome of outcomes) {
        if (outcome.isRunNow && !outcome.hasRun) {
          expect(outcome.refusalCode).toBe(JOB_RUN_REFUSAL_CODES.jobIsRunning)
        }
      }
      for (const id of jobIds) {
        expect(runningCountById[id]).toBe(0)
        expect(ranCountById[id]).toBe(outcomes.filter((outcome) => outcome.id === id && outcome.hasRun).length)
      }
    }
    infoSpy.mockRestore()
  })
})
