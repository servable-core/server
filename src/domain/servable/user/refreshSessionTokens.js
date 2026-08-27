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

  const session = await new Servable.App.Query('_Session')
    .equalTo('refreshTokenHash', hashToken(refreshToken))
    .include('user')
    .first({ useMasterKey: true })

  if (!session) {
    throw ({ message: 'Invalid refresh token', code: 401 })
  }

  const expiresAt = session.get('refreshTokenExpiresAt')
  if (!expiresAt || new Date() > expiresAt) {
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

  const isProd = process.env.NODE_ENV === 'production'
  response.cookie(
    'refresh_token',
    newRefreshToken,
    {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'None' : 'Lax',
      path: '/',
      domain: cookieDomain,
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
