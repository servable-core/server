import envOr from '../utils/envOr.js'

// Pure config resolver - reads process.env at call time (no caching, so tests can mutate env
// between calls) and falls back to fixed defaults. No network, no file I/O, no Parse.
//
// jwtSecret has NO default: an access token signed/verified with a guessable fallback secret
// would be a silent auth bypass. Callers (userResolver, mint) must treat a missing secret as
// "access tokens are not configured for this deployment" and skip that code path entirely,
// falling back to the legacy session-token mechanism instead of failing closed for everyone.
export default () => ({
  accessTokenTTL: parseInt(envOr(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS, 3600), 10), // 1 hour
  refreshTokenTTL: parseInt(envOr(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS, 2592000), 10), // 30 days
  refreshTokenTTLRememberMe: parseInt(envOr(process.env.AUTH_REFRESH_TOKEN_TTL_REMEMBER_ME_SECONDS, 7776000), 10), // 90 days
  jwtSecret: envOr(process.env.AUTH_JWT_SECRET, null),
  // Ties a refresh token to the installationId it was originally minted under - enabled by
  // default, one env var to disable. Real defense-in-depth (a leaked refresh token alone isn't
  // enough without the matching device cookie too), but not equivalent to hardware-backed device
  // attestation - a full XSS compromise can read both.
  deviceBindingEnabled: envOr(process.env.AUTH_DEVICE_BINDING_ENABLED, '1') !== '0',
  // How long a step-up confirmation (password re-entry) stays valid before a requireStepUp
  // route demands it again, regardless of how fresh the access/refresh tokens themselves are.
  stepUpFreshnessSeconds: parseInt(envOr(process.env.AUTH_STEP_UP_FRESHNESS_SECONDS, 300), 10), // 5 min
})

export const getRefreshTokenTTL = (rememberMe, config) => {
  return rememberMe ? config.refreshTokenTTLRememberMe : config.refreshTokenTTL
}
