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
  // Concurrent-refresh leeway. Rotation is a read-then-write with no compare-and-swap behind it
  // (Parse exposes none, and Servable.App.Transaction needs a replica set, so a standalone-Mongo
  // deployment could not rely on one anyway). Two refreshes presenting the SAME token therefore
  // both used to succeed and each issue a DIFFERENT new token, while _Session kept only the last
  // one written - leaving the browser holding a token the server had already forgotten, and the
  // next refresh failing with "Invalid refresh token" on a session that was never actually
  // compromised. Measured in a real browser, not hypothesised.
  //
  // Within this window the previously-rotated token still authenticates, but ONLY to mint an
  // access token and re-deliver the live refresh token that rotation already issued (a
  // deterministic HMAC of the consumed one, so the same value - see refreshSessionTokens.js): it
  // never rotates again, so exactly one refresh token is ever in flight per rotation and the
  // cookie cannot diverge from the stored hash. The re-delivery is also what repairs a rotation
  // whose response never reached the browser (reload mid-refresh). Only used when
  // refreshTokenRotationUntilUsed below is off; it is the window in which a genuinely stolen
  // consumed token still works. Set to 0 to disable the grace path entirely and restore strict
  // single-use, in either mode.
  refreshTokenRotationLeewaySeconds:
    parseInt(envOr(process.env.AUTH_REFRESH_TOKEN_ROTATION_LEEWAY_SECONDS, 30), 10), // 30s
  // Keep the consumed token accepted (access token + re-delivery of its successor, never a new
  // rotation) until that successor is first used, instead of for a fixed leeway - bounded by the
  // successor's own expiry. A fixed window only rescues a lost rotation response if the browser
  // comes back within it; a reload does, but a tab closed mid-refresh, a laptop lid shut, or a
  // network drop during a navigation does not, and that browser was stranded for good
  // (PEAKUB-391). The next rotation overwrites the previous hash, so "until used" needs no extra
  // bookkeeping: the moment the successor is presented, the consumed token matches nothing.
  //
  // The trade: a replayed consumed token now works until the legitimate client's next refresh
  // (normally its next page load, but possibly days away) instead of for 30s, and the replayer
  // converges on the same live token rather than being locked out - the same convergence
  // deriveRotatedToken already accepts for simultaneous refreshes (see tokenRotation.js).
  // Device binding still applies to every replay. AUTH_REFRESH_TOKEN_ROTATION_UNTIL_USED=0 is the
  // one-line rollback to the fixed leeway above.
  refreshTokenRotationUntilUsed:
    envOr(process.env.AUTH_REFRESH_TOKEN_ROTATION_UNTIL_USED, '1') !== '0',
  stepUpFreshnessSeconds: parseInt(envOr(process.env.AUTH_STEP_UP_FRESHNESS_SECONDS, 300), 10), // 5 min
})

export const getRefreshTokenTTL = (rememberMe, config) => {
  return rememberMe ? config.refreshTokenTTLRememberMe : config.refreshTokenTTL
}
