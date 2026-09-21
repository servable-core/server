import crypto from 'crypto'

// Pure crypto helpers for the access-token/refresh-token pair. No I/O, no Parse, no Express -
// same inputs always produce the same outputs. Hand-rolled HMAC-SHA256 JWT instead of a
// dependency: this package stays dependency-light (see utils/envOr.js-style helpers already
// here) and a JWT here only ever needs symmetric signing, never JWKS/asymmetric verification.

export const generateToken = () => crypto.randomBytes(32).toString('hex')

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

// The rotated token is DERIVED from the one being consumed, not freshly random. Two refreshes
// racing with the same token therefore compute the same successor and converge, instead of each
// minting a different one and leaving the browser holding a token _Session never stored (the
// grace window in refreshSessionTokens.js only rescues a caller arriving AFTER a rotation
// committed - simultaneous callers both match the live hash and both rotate, so randomness here
// is what actually makes them diverge).
//
// Unpredictable without the secret: an attacker holding a refresh token still cannot compute its
// successor, and must call the endpoint to rotate exactly as before. An attacker who has the
// secret can forge access tokens outright, so chain-predictability adds nothing there. The one
// property given up is divergence-on-theft - a thief and the legitimate client rotating the same
// token now converge on one token rather than locking each other out. That lockout was never
// alarmed on, and it surfaced as the real user being signed out; replay OUTSIDE the grace window
// is still rejected identically, so reuse detection itself is unchanged.
export const deriveRotatedToken = (currentToken, secret) => crypto
  .createHmac('sha256', secret)
  .update(`servable:refresh-rotation:${currentToken}`)
  .digest('hex')

// The refresh token rebuilt for a live session whose own refresh token fell out of sync (see
// refreshSessionTokens.js's rebuildFromSession). Deterministic for the same reason rotation is:
// two tabs presenting the same stale cookie at once must rebuild the SAME token, not race two
// different ones into the cookie and the stored hash. The stored hash it replaces is part of the
// input so a LATER rebuild of the same session never re-issues a value that was already handed
// out once and has since been rotated away - no resurrecting an old token. Its own prefix keeps
// it from ever colliding with a rotated token.
export const deriveRebuiltToken = (sessionToken, presentedToken, replacedHash, secret) => crypto
  .createHmac('sha256', secret)
  .update(`servable:refresh-rebuild:${sessionToken}:${presentedToken}:${replacedHash}`)
  .digest('hex')

export const validateRefreshToken = (providedToken, storedHash) => {
  if (!providedToken || !storedHash) return false
  return hashToken(providedToken) === storedHash
}

export const createAccessToken = ({ userId, sessionId, expiresAt, secret }) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    sid: sessionId,
    exp: Math.floor(expiresAt / 1000),
    iat: Math.floor(Date.now() / 1000)
  })).toString('base64url')

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${signature}`
}

// Returns the decoded payload if the signature is valid and the token isn't expired, null
// otherwise. Never throws - callers treat null as "not authenticated via this mechanism" and
// fall back to whatever else they check (e.g. the legacy session-token cookie).
export const verifyAccessToken = ({ token, secret }) => {
  if (!token || typeof token !== 'string' || !secret) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  if (signature !== expectedSignature) return null

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    const now = Math.floor(Date.now() / 1000)
    if (typeof decoded.exp !== 'number' || decoded.exp < now) return null
    return decoded
  } catch {
    return null
  }
}
