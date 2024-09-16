export default async ({
  request,
}) => {
  const sessiontoken = request.headers['x-servable-session-token']
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

    const user = session.get('user')
    if (!user) {
      return null
    }

    return user
  } catch (e) {
    console.error(e)
    return null
  }
}
