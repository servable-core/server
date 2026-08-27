import resolveAuthConfig from '../../../lib/auth/authConfig.js'

// Attached onto Servable.App.User alongside mintSessionTokens/refreshSessionTokens - same
// backfill pattern (domain/servable/index.js's hydrate()). Called by engines/parse-server's
// processHttp for any route declaring requireStepUp: true, using the _authSessionId userResolver
// stamps onto the resolved user (see that file's own comment) - no separate query to find which
// session authenticated this request.
//
// Freshness is per-session (_Session.stepUpAt), not per-user: confirming step-up on one device
// doesn't silently satisfy it for a different, possibly-stolen session elsewhere.
export default async ({ user }) => {
  const authConfig = resolveAuthConfig()
  const sessionId = user?._authSessionId
  if (!sessionId) {
    return false
  }

  const session = await new Servable.App.Query('_Session').get(sessionId, { useMasterKey: true })
  if (!session) {
    return false
  }

  const stepUpAt = session.get('stepUpAt')
  if (!stepUpAt) {
    return false
  }

  const ageSeconds = (Date.now() - new Date(stepUpAt).getTime()) / 1000
  return ageSeconds <= authConfig.stepUpFreshnessSeconds
}
