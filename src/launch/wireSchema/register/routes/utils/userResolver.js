export default async ({
  request,
}) => {
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
