import { generateToken, hashToken, createAccessToken } from '../../../lib/auth/tokenRotation.js'
import resolveAuthConfig, { getRefreshTokenTTL } from '../../../lib/auth/authConfig.js'

// Attached onto Servable.App.User (= Parse.User) alongside mintSessionTokens - see that file's
// comment for the backfill pattern and why cookieDomain is caller-supplied rather than computed
// here.
//
// Exchanges a valid refresh token for a new access token, rotating the refresh token itself in
// the same operation: a stolen-and-later-replayed old refresh token fails outright the moment
// the legitimate client refreshes even once, since the hash stored on _Session is always the
// most recently issued one, never a set of historically-valid ones. Looked up by hashing the
// provided token and querying _Session directly on that hash - no separate session id needs to
// travel alongside the cookie.
export default async ({
  refreshToken,
  request,
  response,
  cookieDomain,
  // See mintSessionTokens.js's own comment for the full rationale - same "expose the raw value
  // in the body only for a verified custom-domain proxy" pattern applies to every rotation, not
  // just the initial mint.
  exposeRefreshToken = false,
  // Current caller's device identifier (x-servable-installation-id) - compared against
  // whatever installationId this _Session was originally minted under. See authConfig.js's
  // deviceBindingEnabled comment for what this does and doesn't protect against.
  installationId,
}) => {
  const authConfig = resolveAuthConfig()
  if (!authConfig.jwtSecret) {
    throw ({ message: 'Access tokens are not configured for this deployment', code: 501 })
  }

  if (!refreshToken) {
    throw ({ message: 'No refresh token provided', code: 401 })
  }

  const isProd = process.env.NODE_ENV === 'production'
  // Shared by the rotation's own Set-Cookie below and by the clearCookie calls that reject a
  // token which can never succeed again. A browser only honors clearCookie when every option
  // except expires/maxAge matches what set it, so these must not drift apart - the same trap
  // backend/main's own removeSessionToken documents for the session cookie.
  const refreshCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
    path: '/',
    domain: cookieDomain,
  }

  const session = await new Servable.App.Query('_Session')
    .equalTo('refreshTokenHash', hashToken(refreshToken))
    .include('user')
    .first({ useMasterKey: true })

  if (!session) {
    // Deliberately NOT cleared here, unlike the expiry and device-mismatch cases below. A hash
    // matching no session is also exactly what the LOSING side of a concurrent rotation sees:
    // two tabs refreshing at once, the winner already rotated the hash and Set-Cookie'd the new
    // token, so clearing here would let the loser delete the winner's perfectly good fresh
    // cookie. Rotation reuse-detection depends on this staying a plain rejection.
    throw ({ message: 'Invalid refresh token', code: 401 })
  }

  const expiresAt = session.get('refreshTokenExpiresAt')
  if (!expiresAt || new Date() > expiresAt) {
    // Time-based and irreversible, so there's no concurrent-rotation race to lose by clearing -
    // and clearing is what stops the client replaying a dead token on every later page load.
    response.clearCookie('refresh_token', refreshCookieOptions)
    throw ({ message: 'Refresh token expired', code: 401 })
  }

  const user = session.get('user')
  if (!user) {
    throw ({ message: 'Invalid session', code: 401 })
  }

  if (authConfig.deviceBindingEnabled) {
    const boundInstallationId = session.get('installationId')
    // Only enforced when BOTH sides are actually present - a session/request missing
    // installationId (older data, a caller that doesn't send the header) fails open on this
    // check rather than locking out a legitimate user over incomplete data. Real theft-of-just-
    // the-cookie cases (the scenario this defends) always have both values.
    if (boundInstallationId && installationId && boundInstallationId !== installationId) {
      // createdWith is the load-bearing field when diagnosing one of these: installationId
      // reaches _Session by a different route per login path (parse-server's own
      // X-Parse-Installation-Id header for password login/signup, an explicit session.set for
      // emailCode - see backend/main's redeemlogincode.js), so knowing which path minted this
      // session is what separates a real stolen-cookie replay from a binding that was never
      // written consistently to begin with.
      console.warn('[Servable Auth] refresh rejected: device mismatch', JSON.stringify({
        userId: user.id,
        sessionId: session.id,
        boundInstallationId,
        requestInstallationId: installationId,
        createdWith: session.get('createdWith') || null,
      }))
      // Cleared rather than left for the client to replay: this token is bound to an
      // installationId the caller has just demonstrated it will not present, so every later page
      // load would otherwise repeat this same rejected call forever. This does NOT sign the
      // caller out - the legacy session-token cookie is resolved independently (userResolver.js)
      // and is untouched here.
      response.clearCookie('refresh_token', refreshCookieOptions)
      throw ({ message: 'Refresh token is bound to a different device', code: 401 })
    }
  }

  const rememberMe = session.get('rememberMe') || false
  const newRefreshToken = generateToken()
  const newRefreshTokenTTL = getRefreshTokenTTL(rememberMe, authConfig)
  const newRefreshTokenExpiresAt = new Date(Date.now() + newRefreshTokenTTL * 1000)

  session.set('refreshTokenHash', hashToken(newRefreshToken))
  session.set('refreshTokenExpiresAt', newRefreshTokenExpiresAt)
  await session.save(null, { useMasterKey: true })

  const accessToken = createAccessToken({
    userId: user.id,
    sessionId: session.id,
    expiresAt: Date.now() + (authConfig.accessTokenTTL * 1000),
    secret: authConfig.jwtSecret
  })

  response.cookie(
    'refresh_token',
    newRefreshToken,
    {
      ...refreshCookieOptions,
      maxAge: newRefreshTokenTTL * 1000,
    }
  )

  return {
    accessToken,
    refreshToken: exposeRefreshToken ? newRefreshToken : 'exists',
    expiresIn: authConfig.accessTokenTTL,
    tokenType: 'Bearer',
    refreshTokenExpiresIn: newRefreshTokenTTL,
  }
}
