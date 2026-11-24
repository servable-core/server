import { trace } from '@opentelemetry/api'
import { serverMetrics } from '../proof/serverMetrics.js'

// Production proof 3.5 (.docs/technical/production-proof-instrumentation-2026-11-23.md): how each request's session was found,
// and what the session-user cache did. Labels from closed lists only, never a token, its digest, a session or a user:
//   servable_session_resolutions_total{path = jwt | cache | session_query | no_token, result = user | none | device_mismatch}
//   servable_session_user_cache_remembered_total{outcome = stored | refused_invalidated | refused_invalid}
//   servable_session_user_cache_invalidations_total{kind = token | session | user | everything}  (`everything` is the coarse
//     fallback of an engine that cannot tell what a write touched: a high rate empties the cache for nothing)
//   servable_session_user_cache_entries  (a gauge, set on each change)
// and, on the request's active span, `servable.session.source` (one attribute, so Tempo tells a cached session from a query).

const RESOLUTION_PATHS = ['jwt', 'cache', 'session_query', 'no_token']
const RESOLUTION_RESULTS = ['user', 'none', 'device_mismatch']

/**
 * Counts one resolution and marks the active span with where the session came from. Never throws.
 * @param {{ path: string, result: string }} props
 */
export const recordTheSessionResolution = ({ path, result }) => {
  try {
    serverMetrics().counter('servable_session_resolutions_total', {
      description: 'Count of request session resolutions by path (jwt, cache, session_query, no_token) and result (user, none, device_mismatch).',
    }).add(1, {
      path: RESOLUTION_PATHS.includes(path) ? path : 'other',
      result: RESOLUTION_RESULTS.includes(result) ? result : 'other',
    })
    if (path !== 'no_token') {
      trace.getActiveSpan()?.setAttribute('servable.session.source', path)
    }
  } catch (error) {
    // A count never fails a request.
  }
}

/**
 * The signals the cache sends, one function each (a test hands its own).
 */
export const sessionUserCacheSignals = {
  /** @param {'stored' | 'refused_invalidated' | 'refused_invalid'} outcome */
  remembered: (outcome) => {
    try {
      serverMetrics().counter('servable_session_user_cache_remembered_total', {
        description: 'Count of session-user cache stores by outcome (stored, refused_invalidated, refused_invalid).',
      }).add(1, { outcome })
    } catch (error) {
      // A count never fails a request.
    }
  },
  /** @param {'token' | 'session' | 'user' | 'everything'} kind */
  invalidated: (kind) => {
    try {
      serverMetrics().counter('servable_session_user_cache_invalidations_total', {
        description: 'Count of session invalidations the session-user cache received, by kind (token, session, user, everything).',
      }).add(1, { kind })
    } catch (error) {
      // A count never fails a write.
    }
  },
  /** @param {number} size */
  sized: (size) => {
    try {
      serverMetrics().gauge('servable_session_user_cache_entries', {
        description: 'Entries in this process\'s session-user cache.',
      }).set(size)
    } catch (error) {
      // A count never fails a request.
    }
  },
}
