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
  // default, one env var to disable. Scope it honestly: the device id travels as an ordinary
  // cookie in the same jar as the refresh token, so every leak path that yields one yields the
  // other (cookie-jar theft, MITM, full browser compromise), and a deployment still running the
  // legacy session-token cookie alongside this hands out a longer-lived credential that carries
  // no binding at all. What it does cover is a refresh token that leaked on its own - e.g. the
  // header-forwarded copy a same-origin proxy sends upstream turning up in that proxy's logs.
  // Treat it as narrowing one leak path, not as device attestation.
  deviceBindingEnabled: envOr(process.env.AUTH_DEVICE_BINDING_ENABLED, '1') !== '0',
  // The same check applied to the legacy session-token path in userResolver.js. Deliberately its
  // OWN switch rather than reusing deviceBindingEnabled above, because the blast radius is not
  // comparable: a rejection on the refresh path is a silent failed refresh the legacy cookie then
  // covers for, whereas a rejection here signs the caller out on the spot. Turning this on also
  // invalidates any EXISTING session whose stored installationId no longer matches what its
  // client now sends - so roll it out knowing some users get logged out once, and
  // AUTH_LEGACY_SESSION_DEVICE_BINDING=0 is the one-line rollback.
  legacySessionDeviceBindingEnabled:
    envOr(process.env.AUTH_LEGACY_SESSION_DEVICE_BINDING, '1') !== '0',
  // How long a step-up confirmation (password re-entry) stays valid before a requireStepUp
  // route demands it again, regardless of how fresh the access/refresh tokens themselves are.
  stepUpFreshnessSeconds: parseInt(envOr(process.env.AUTH_STEP_UP_FRESHNESS_SECONDS, 300), 10), // 5 min
})

export const getRefreshTokenTTL = (rememberMe, config) => {
  return rememberMe ? config.refreshTokenTTLRememberMe : config.refreshTokenTTL
}
