// Attached onto Servable.App.User alongside the other session functions. Re-verifies the
// already-authenticated user's password (no new session minted - Parse.User.verifyPassword is
// built exactly for "confirm identity without logging in again") and stamps the CURRENT
// session's stepUpAt, satisfying checkStepUpFreshness for that session going forward until it
// ages out (authConfig.stepUpFreshnessSeconds).
export default async ({ user, password }) => {
  if (!user?._authSessionId) {
    throw ({ message: 'No active session to confirm step-up for', code: 401 })
  }

  if (!password) {
    throw ({ message: 'Password is required', code: 400 })
  }

  const username = user.get('username') || user.get('email')
  try {
    await Servable.App.User.verifyPassword(username, password, { useMasterKey: true })
  } catch (e) {
    throw ({ message: 'Incorrect password', code: 401 })
  }

  const session = await new Servable.App.Query('_Session').get(user._authSessionId, { useMasterKey: true })
  if (!session) {
    throw ({ message: 'No active session to confirm step-up for', code: 401 })
  }

  session.set('stepUpAt', new Date())
  await session.save(null, { useMasterKey: true })

  return { stepUpConfirmed: true }
}
