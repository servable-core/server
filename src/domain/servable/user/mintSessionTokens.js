import { generateToken, hashToken, createAccessToken } from '../../../lib/auth/tokenRotation.js'
import resolveAuthConfig, { getRefreshTokenTTL } from '../../../lib/auth/authConfig.js'

// Attached onto Servable.App.User (= Parse.User, see engines/parse-server/src/register/index.js)
// as an additional function alongside whatever the engine already provides (logIn, logInWith,
// ...) - see domain/servable/index.js's hydrate() for the backfill wiring, same pattern already
// used for Transaction.
//
// Mints an access token + refresh token pair for an ALREADY-authenticated session (this does
// not itself log anyone in - callers still do that via App.User.logIn/logInWith/etc, then pass
// the resulting sessionToken here). Returns null when this deployment hasn't configured
// AUTH_JWT_SECRET - callers should treat that as "access/refresh tokens are opt-in and not
// enabled here," not as an error.
//
// cookieDomain is passed in by the caller rather than resolved here: a custom-domain vs.
// platform-domain cookie-scoping decision is app-specific (e.g. Peakub's own Redis-backed
// isActiveCustomDomain check), not something this framework function should know how to compute.
export default async ({
  user,
  sessionToken,
  request,
  response,
  rememberMe = false,
  cookieDomain,
  // Only true for a verified custom-domain Origin (same check as dumbUserForAuth's
  // exposeSessionToken) - the raw refresh token otherwise never leaves this cookie, exactly
  // like the real session token. A custom domain's own httpOnly cookie can never be set by
  // this response (cross-eTLD+1, same restriction as the session cookie), so the caller's
  // same-origin proxy is the only other channel - it needs the raw value from the body to
  // mint its own cookie on the domain that actually served the request.
  exposeRefreshToken = false,
}) => {
  const authConfig = resolveAuthConfig()
  if (!authConfig.jwtSecret) {
    return null
  }

  const session = await new Servable.App.Query('_Session')
    .equalTo('sessionToken', sessionToken)
    .first({ useMasterKey: true })
  if (!session) {
    return null
  }

  const refreshToken = generateToken()
  const refreshTokenTTL = getRefreshTokenTTL(rememberMe, authConfig)
  const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenTTL * 1000)

  session.set('refreshTokenHash', hashToken(refreshToken))
  session.set('refreshTokenExpiresAt', refreshTokenExpiresAt)
  session.set('rememberMe', rememberMe)
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
    refreshToken,
    {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'None' : 'Lax',
      path: '/',
      domain: cookieDomain,
      maxAge: refreshTokenTTL * 1000,
    }
  )

  return {
    accessToken,
    // Redacted by default - never sent raw unless a verified custom-domain proxy needs it to
    // mint its own cookie (see the param comment above). Same "exists" placeholder convention
    // dumbUserForAuth already uses for sessiontoken.
    refreshToken: exposeRefreshToken ? refreshToken : 'exists',
    expiresIn: authConfig.accessTokenTTL,
    tokenType: 'Bearer',
    refreshTokenExpiresIn: refreshTokenTTL,
  }
}
