import { deriveRotatedToken, hashToken, createAccessToken } from '../../../lib/auth/tokenRotation.js'
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

  const presentedHash = hashToken(refreshToken)

  let session = await new Servable.App.Query('_Session')
    .equalTo('refreshTokenHash', presentedHash)
    .include('user')
    .first({ useMasterKey: true })

  // Nothing matched the CURRENT hash - before rejecting, check whether this is the token the
  // most recent rotation just consumed, still inside its leeway window. That is the ordinary
  // shape of two refreshes racing from one browser (a page load whose mount effect refreshes
  // while an in-flight request refreshes too, or simply a second tab), not an attack: this
  // rotation is a read-then-write with no compare-and-swap available, so without the window both
  // callers rotate, each issues a different token, and the browser is left holding whichever
  // Set-Cookie arrived last while _Session kept whichever write landed last - two independent
  // coin flips that disagree half the time. See authConfig.js's own comment for the full
  // rationale and the security trade being made.
  let isGraceReplay = false
  if (!session && authConfig.refreshTokenRotationLeewaySeconds > 0) {
    const rotatedFrom = await new Servable.App.Query('_Session')
      .equalTo('previousRefreshTokenHash', presentedHash)
      .include('user')
      .first({ useMasterKey: true })

    const graceUntil = rotatedFrom?.get('previousRefreshTokenGraceUntil')
    if (rotatedFrom && graceUntil && new Date() <= graceUntil) {
      session = rotatedFrom
      isGraceReplay = true
    }
  }

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

  // Inside the leeway window: mint the access token the caller actually came for, and stop.
  // Deliberately no rotation and no Set-Cookie - the rotation this token was consumed by has
  // already issued the one live refresh token, and writing a second one here is precisely the
  // divergence this path exists to prevent. Returning 'exists' rather than a raw token is also
  // what keeps the custom-domain proxy from re-minting its own copy (it skips any body whose
  // refreshToken is 'exists'), so the caller's existing cookie is left untouched there too.
  if (isGraceReplay) {
    const accessToken = createAccessToken({
      userId: user.id,
      sessionId: session.id,
      expiresAt: Date.now() + (authConfig.accessTokenTTL * 1000),
      secret: authConfig.jwtSecret
    })

    return {
      accessToken,
      refreshToken: 'exists',
      expiresIn: authConfig.accessTokenTTL,
      tokenType: 'Bearer',
      // The live token's own remaining life, not a fresh full TTL - nothing was rotated, so
      // reporting a full window here would let a caller size a cookie past the real expiry.
      refreshTokenExpiresIn: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    }
  }

  const rememberMe = session.get('rememberMe') || false
  const newRefreshToken = deriveRotatedToken(refreshToken, authConfig.jwtSecret)
  const newRefreshTokenTTL = getRefreshTokenTTL(rememberMe, authConfig)
  const newRefreshTokenExpiresAt = new Date(Date.now() + newRefreshTokenTTL * 1000)

  session.set('refreshTokenHash', hashToken(newRefreshToken))
  session.set('refreshTokenExpiresAt', newRefreshTokenExpiresAt)
  // The token just consumed stays usable for a short, access-token-only grace period, so a
  // concurrent caller still presenting it converges on this same rotation instead of starting a
  // competing one. Stored as a hash like the live one - the raw value is never persisted.
  session.set('previousRefreshTokenHash', presentedHash)
  session.set(
    'previousRefreshTokenGraceUntil',
    new Date(Date.now() + (authConfig.refreshTokenRotationLeewaySeconds * 1000))
  )
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
