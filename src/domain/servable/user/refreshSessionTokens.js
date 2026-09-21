import { deriveRotatedToken, deriveRebuiltToken, hashToken, createAccessToken } from '../../../lib/auth/tokenRotation.js'
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
//
// Outcomes, in order: a live token rotates; a consumed token whose successor is still unused (or,
// with refreshTokenRotationUntilUsed off, one inside the fixed leeway) gets the live one
// re-delivered; anything else unusable is rebuilt from the caller's live session token when it
// has one; only when none of that applies is the refresh_token cookie cleared and a 401 thrown,
// carrying a `reason` (missing | invalid | expired | invalid_session | device_mismatch).
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
  // The caller's session token (the app's session cookie, or a proxy's forwarded header), when
  // it has one. Optional. The refresh token is a child of the _Session it is stored on, not an
  // independent credential: whenever the refresh token is unusable - missing, stale after a
  // rotation whose response never arrived, expired - but this session is still live, a new
  // refresh token is rebuilt for it instead of the refresh path failing until the next login.
  // See rebuildFromSession below for why this grants nothing the session token doesn't already.
  sessionToken,
}) => {
  const authConfig = resolveAuthConfig()
  if (!authConfig.jwtSecret) {
    throw ({ message: 'Access tokens are not configured for this deployment', code: 501 })
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

  // Every way this call can end without a usable token funnels through here, after
  // rebuildFromSession has had its chance. Cleared unconditionally now: the case that used to
  // forbid clearing - the LOSING side of two concurrent rotations, whose clear would delete the
  // winner's fresh cookie - never reaches this point any more, since a loser inside the grace
  // window takes the grace path (and gets that same fresh token re-delivered). What does reach
  // it is a token that can never work again, and leaving it in place is what made the client
  // replay it on every page load, forever. `reason` is for the caller's logs and its own cleanup (e.g.
  // dropping a "signed in" hint cookie); the message stays the one clients already match on.
  const reject = ({ message, reason }) => {
    response.clearCookie('refresh_token', refreshCookieOptions)
    throw ({ message, code: 401, reason })
  }

  // Rebuilds a refresh token for the caller's own live _Session, identified by its session
  // token. Grants nothing new: a session token already authenticates every request on its own
  // (userResolver.js) for as long as its _Session lives, whatever the browser-side cookie maxAge
  // says - so the rebuilt token is capped at that same _Session.expiresAt and never outlives it.
  // It also evicts whoever holds any older refresh token for this session, because it replaces
  // the stored hash and drops the previous one (no grace for a token nobody can vouch for).
  //
  // Deterministic, like rotation itself: two tabs arriving with the same stale cookie at once
  // rebuild the SAME token rather than racing two different ones into the cookie and the stored
  // hash (see deriveRebuiltToken for why the replaced hash is part of the input).
  const rebuildFromSession = async ({ failedReason }) => {
    if (!sessionToken) {
      return null
    }

    const live = await new Servable.App.Query('_Session')
      .equalTo('sessionToken', sessionToken)
      .include('user')
      .first({ useMasterKey: true })
    const liveUser = live?.get('user')
    const sessionExpiresAt = live?.get('expiresAt')
    if (!live || !liveUser || (sessionExpiresAt && new Date() >= sessionExpiresAt)) {
      return null
    }

    if (authConfig.deviceBindingEnabled) {
      const boundInstallationId = live.get('installationId')
      if (boundInstallationId && installationId && boundInstallationId !== installationId) {
        console.warn('[Servable Auth] refresh rebuild refused: device mismatch', JSON.stringify({
          userId: liveUser.id,
          sessionId: live.id,
          boundInstallationId,
          requestInstallationId: installationId,
          createdWith: live.get('createdWith') || null,
        }))
        return null
      }
    }

    const rememberMe = live.get('rememberMe') || false
    const ttlMs = Math.min(
      getRefreshTokenTTL(rememberMe, authConfig) * 1000,
      sessionExpiresAt ? sessionExpiresAt.getTime() - Date.now() : Infinity
    )
    const ttlSeconds = Math.floor(ttlMs / 1000)
    if (ttlSeconds <= 0) {
      return null
    }

    const rebuiltToken = deriveRebuiltToken(
      sessionToken,
      refreshToken || '',
      live.get('refreshTokenHash') || '',
      authConfig.jwtSecret
    )
    live.set('refreshTokenHash', hashToken(rebuiltToken))
    live.set('refreshTokenExpiresAt', new Date(Date.now() + ttlSeconds * 1000))
    live.unset('previousRefreshTokenHash')
    live.unset('previousRefreshTokenGraceUntil')
    await live.save(null, { useMasterKey: true })

    // Warn, not error: this is the mechanism healing itself, but every occurrence is a refresh
    // token that fell out of sync, and a spike of them is worth being able to see.
    console.warn('[Servable Auth] refresh token rebuilt from session', JSON.stringify({
      userId: liveUser.id,
      sessionId: live.id,
      reason: failedReason,
      createdWith: live.get('createdWith') || null,
    }))

    response.cookie('refresh_token', rebuiltToken, { ...refreshCookieOptions, maxAge: ttlSeconds * 1000 })

    return {
      accessToken: createAccessToken({
        userId: liveUser.id,
        sessionId: live.id,
        expiresAt: Date.now() + (authConfig.accessTokenTTL * 1000),
        secret: authConfig.jwtSecret
      }),
      refreshToken: exposeRefreshToken ? rebuiltToken : 'exists',
      expiresIn: authConfig.accessTokenTTL,
      tokenType: 'Bearer',
      refreshTokenExpiresIn: ttlSeconds,
    }
  }

  const failWith = async ({ message, reason }) => {
    const rebuilt = await rebuildFromSession({ failedReason: reason })
    if (rebuilt) {
      return rebuilt
    }
    return reject({ message, reason })
  }

  if (!refreshToken) {
    return failWith({ message: 'No refresh token provided', reason: 'missing' })
  }

  const presentedHash = hashToken(refreshToken)

  let session = await new Servable.App.Query('_Session')
    .equalTo('refreshTokenHash', presentedHash)
    .include('user')
    .first({ useMasterKey: true })

  // Nothing matched the CURRENT hash - before rejecting, check whether this is the token the
  // most recent rotation just consumed, still inside its grace window (by default: until its
  // successor is first used - see authConfig.js's refreshTokenRotationUntilUsed). That is the ordinary
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
    // Matches neither the live token nor a consumed one still inside its grace window: e.g. the
    // browser missed a rotation's response and the fixed leeway (UNTIL_USED off) has closed, a
    // token two or more rotations old, or one whose _Session no longer exists. A stolen-and-
    // replayed old token lands here too, and stays rejected unless the caller ALSO holds a live
    // session token - at which point it could already act as the user regardless.
    return failWith({ message: 'Invalid refresh token', reason: 'invalid' })
  }

  const expiresAt = session.get('refreshTokenExpiresAt')
  if (!expiresAt || new Date() > expiresAt) {
    return failWith({ message: 'Refresh token expired', reason: 'expired' })
  }

  const user = session.get('user')
  if (!user) {
    return failWith({ message: 'Invalid session', reason: 'invalid_session' })
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
      // Never usable from this caller: it is bound to an installationId the caller has just
      // demonstrated it will not present. The caller's OWN session (if it presented one) still
      // gets its chance - rebuildFromSession runs its own device check against that session's
      // binding, so this cannot be used to launder the mismatched one.
      return failWith({ message: 'Refresh token is bound to a different device', reason: 'device_mismatch' })
    }
  }

  // Inside the grace window: mint the access token the caller actually came for, and re-deliver
  // the live refresh token the consuming rotation already issued - never a new one, so no second
  // rotation happens here. Re-delivering is what repairs a rotation whose response never reached
  // the browser (a reload or navigation while the refresh was in flight, a closed tab, the
  // custom-domain proxy aborting on disconnect): the server had committed the new hash, the
  // browser kept the consumed token, and without this Set-Cookie it would keep presenting that
  // token until the window closed and then fail with "Invalid refresh token" for good.
  // Reproduced against a real backend 2026-09-21 (PEAKUB-391).
  //
  // Safe because deriveRotatedToken is a deterministic HMAC of the consumed token: this is
  // byte-for-byte the token the rotation issued, so the cookie still cannot diverge from the
  // stored hash - checked explicitly below rather than assumed, and if they ever disagree (the
  // live hash was replaced some other way) the caller only gets the access token, as before.
  if (isGraceReplay) {
    const accessToken = createAccessToken({
      userId: user.id,
      sessionId: session.id,
      expiresAt: Date.now() + (authConfig.accessTokenTTL * 1000),
      secret: authConfig.jwtSecret
    })

    // The live token's own remaining life, not a fresh full TTL - nothing was rotated, so a
    // full window here would size the cookie past the real expiry.
    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    const liveRefreshToken = deriveRotatedToken(refreshToken, authConfig.jwtSecret)
    const canRedeliver = hashToken(liveRefreshToken) === session.get('refreshTokenHash')

    if (canRedeliver) {
      response.cookie(
        'refresh_token',
        liveRefreshToken,
        {
          ...refreshCookieOptions,
          maxAge: remainingSeconds * 1000,
        }
      )
    }

    return {
      accessToken,
      // Raw value for a verified custom-domain proxy, same as a real rotation: that proxy only
      // repairs its own copy of the cookie when it sees one.
      refreshToken: (canRedeliver && exposeRefreshToken) ? liveRefreshToken : 'exists',
      expiresIn: authConfig.accessTokenTTL,
      tokenType: 'Bearer',
      refreshTokenExpiresIn: remainingSeconds,
    }
  }

  const rememberMe = session.get('rememberMe') || false
  const newRefreshToken = deriveRotatedToken(refreshToken, authConfig.jwtSecret)
  const newRefreshTokenTTL = getRefreshTokenTTL(rememberMe, authConfig)
  const newRefreshTokenExpiresAt = new Date(Date.now() + newRefreshTokenTTL * 1000)

  session.set('refreshTokenHash', hashToken(newRefreshToken))
  session.set('refreshTokenExpiresAt', newRefreshTokenExpiresAt)
  // The token just consumed stays usable on the grace path (access token + re-delivery of this
  // rotation's token, never a second rotation), so a concurrent caller converges on this same
  // rotation and a browser that never received this response can still collect it. By default
  // that lasts until the new token is first used - the next rotation overwrites this hash - and
  // never past the new token's own expiry; with refreshTokenRotationUntilUsed off it is the
  // fixed leeway instead (see authConfig.js for the trade). Stored as a hash like the live one -
  // the raw value is never persisted.
  session.set('previousRefreshTokenHash', presentedHash)
  session.set(
    'previousRefreshTokenGraceUntil',
    authConfig.refreshTokenRotationUntilUsed
      ? newRefreshTokenExpiresAt
      : new Date(Date.now() + (authConfig.refreshTokenRotationLeewaySeconds * 1000))
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
