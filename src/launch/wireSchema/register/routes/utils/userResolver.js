import resolveAuthConfig from '../../../../../lib/auth/authConfig.js'
import { verifyAccessToken } from '../../../../../lib/auth/tokenRotation.js'

export default async ({
  request,
}) => {
  // Bearer access token (new, short-lived JWT) takes priority when present and configured -
  // it's self-contained (no _Session lookup needed) and is what a client sends once it has
  // completed at least one refresh. AUTH_JWT_SECRET being unset means this deployment hasn't
  // opted into access tokens at all; falling through to the legacy cookie keeps every existing
  // app working with zero config changes.
  const authConfig = resolveAuthConfig()
  if (authConfig.jwtSecret) {
    const authHeader = request.headers?.['authorization'] || ''
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (match) {
      const decoded = verifyAccessToken({ token: match[1], secret: authConfig.jwtSecret })
      if (decoded?.sub) {
        try {
          const user = await new Servable.App.Query('_User').get(decoded.sub, { useMasterKey: true })
          if (user) {
            // Transient, request-scoped only - never persisted (no .set()/.save() involved).
            // Lets a requireStepUp route locate the exact _Session this request authenticated
            // with (via processHttp's checkStepUpFreshness call) without a second full lookup -
            // the JWT payload already carries the session id (sid), no query needed here.
            user._authSessionId = decoded.sid
            return user
          }
        } catch (e) {
          // Fall through to legacy resolution below (e.g. user deleted since token was issued).
        }
      }
    }
  }

  const sessiontoken = getSessionToken(request)
  if (!sessiontoken) {
    return null
  }

  try {
    const query = new Servable.App.Query('_Session')
      .equalTo("sessionToken", sessiontoken)
      .greaterThan("expiresAt", (new Date()))
      .include("user")

    const session = await query.first({ useMasterKey: true })
    if (!session) {
      return null
    }

    // Same device check refreshSessionTokens.js applies to the refresh token, extended to this
    // path - without it the legacy cookie is the way AROUND device binding: a caller holding it
    // never touches the refresh endpoint, so the binding there never sees them. Fails open when
    // either side is missing, exactly like the refresh path, so partner API callers sending the
    // token as a bare header (see getSessionToken below) and older sessions predating
    // installationId keep working.
    if (authConfig.legacySessionDeviceBindingEnabled) {
      const boundInstallationId = session.get('installationId')
      const installationId = request.headers?.['x-servable-installation-id']
      if (boundInstallationId && installationId && boundInstallationId !== installationId) {
        console.warn('[Servable Auth] session rejected: device mismatch', JSON.stringify({
          sessionId: session.id,
          boundInstallationId,
          requestInstallationId: installationId,
          createdWith: session.get('createdWith') || null,
        }))
        return null
      }
    }

    const user = session.get('user')
    if (!user) {
      return null
    }

    user._authSessionId = session.id
    return user
  } catch (e) {
    console.error(e)
    return null
  }
}


import cookie from 'cookie'; // built-in parser lib (lightweight)

function getSessionToken(request) {
  // 1️⃣ First, try custom header (for partner APIs, etc.)
  const headerToken = request.headers['x-servable-session-token'];
  if (headerToken) return headerToken;

  // 2️⃣ Then, try cookie-parser's output
  const parsedCookie = request.cookies?.['x-servable-session-token'];
  if (parsedCookie) return parsedCookie;

  // 3️⃣ Finally, parse raw cookie header if needed
  const raw = request.headers.cookie;
  if (raw) {
    const cookies = cookie.parse(raw);
    return cookies['x-servable-session-token'] || null;
  }

  return null;
}
