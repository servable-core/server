import crypto from 'crypto'

// Pure crypto helpers for the access-token/refresh-token pair. No I/O, no Parse, no Express -
// same inputs always produce the same outputs. Hand-rolled HMAC-SHA256 JWT instead of a
// dependency: this package stays dependency-light (see utils/envOr.js-style helpers already
// here) and a JWT here only ever needs symmetric signing, never JWKS/asymmetric verification.

export const generateToken = () => crypto.randomBytes(32).toString('hex')

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

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
