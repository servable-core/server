import { jest } from '@jest/globals'
import refreshSessionTokens from '../../src/domain/servable/user/refreshSessionTokens.js'
import { hashToken } from '../../src/lib/auth/tokenRotation.js'

// No module mocks needed: refreshSessionTokens.js reaches for the global `Servable` at call time
// and is otherwise pure, so a fake Query over an in-memory store is enough - and lets the test
// reproduce the exact interleaving that broke a real browser session (two refreshes presenting
// the same token, each rotating to a DIFFERENT new one, leaving the cookie and _Session
// disagreeing and every later refresh 401ing on a session nobody had compromised).
//
// The fake deliberately hands each caller its OWN object instance for the same row, the way two
// concurrent HTTP requests really would. Sharing one instance would hide the bug entirely.
const SECRET = 'test-secret-value'

const makeStore = () => {
    const rows = []
    class FakeQuery {
        constructor() { this.eq = {} }
        equalTo(k, v) { this.eq[k] = v; return this }
        include() { return this }
        async first() {
            const row = rows.find((r) => Object.entries(this.eq).every(([k, v]) => r[k] === v))
            if (!row) return undefined
            const data = { ...row }
            return {
                id: row.id,
                get: (k) => data[k],
                set: (k, v) => { data[k] = v },
                unset: (k) => { data[k] = undefined },
                save: async () => { Object.assign(row, data) },
            }
        }
    }
    return { rows, FakeQuery }
}

const seedSession = (rows, token, extra = {}) => {
    rows.push({
        id: 'session-1',
        refreshTokenHash: hashToken(token),
        refreshTokenExpiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1' },
        rememberMe: false,
        ...extra,
    })
}

const makeResponse = () => ({ cookie: jest.fn(), clearCookie: jest.fn() })

const cookieValues = (response) => response.cookie.mock.calls
    .filter((c) => c[0] === 'refresh_token')
    .map((c) => c[1])

beforeEach(() => {
    process.env.AUTH_JWT_SECRET = SECRET
    delete process.env.AUTH_REFRESH_TOKEN_ROTATION_LEEWAY_SECONDS
    delete process.env.AUTH_REFRESH_TOKEN_ROTATION_UNTIL_USED
})

describe('refreshSessionTokens concurrent rotation', () => {
    test('two SIMULTANEOUS refreshes of the same token converge on one successor', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-simultaneous'
        seedSession(rows, token)

        const responseA = makeResponse()
        const responseB = makeResponse()

        // Both start before either has saved - the real race.
        const [a, b] = await Promise.all([
            refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: responseA }),
            refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: responseB }),
        ])

        expect(a.accessToken).toBeTruthy()
        expect(b.accessToken).toBeTruthy()

        const issued = [...cookieValues(responseA), ...cookieValues(responseB)]
        expect(issued).toHaveLength(2)
        // The whole point: whichever Set-Cookie the browser keeps, it is the same value.
        expect(issued[0]).toBe(issued[1])
        // ...and it is the one _Session actually stored, whichever save landed last.
        expect(rows[0].refreshTokenHash).toBe(hashToken(issued[0]))
    })

    test('the token a completed rotation consumed still mints an access token inside the leeway, without rotating again', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-stale'
        seedSession(rows, token)

        const first = makeResponse()
        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: first })
        const hashAfterRotation = rows[0].refreshTokenHash

        // A second tab still holding the pre-rotation cookie.
        const second = makeResponse()
        const result = await refreshSessionTokens({
            refreshToken: token, request: { headers: {} }, response: second,
        })

        expect(result.accessToken).toBeTruthy()
        expect(result.refreshToken).toBe('exists')
        // Re-delivered, not competing: the exact token the first rotation issued.
        expect(cookieValues(second)).toEqual(cookieValues(first))
        expect(second.clearCookie).not.toHaveBeenCalled() // and not signed out
        expect(rows[0].refreshTokenHash).toBe(hashAfterRotation) // nothing re-rotated
    })

    // PEAKUB-391: the rotation's response never reaches the browser (reload mid-refresh), so the
    // browser still holds the consumed token while _Session already stores its successor.
    test('a rotation whose response was LOST is repaired by the next refresh inside the leeway', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-lost-response'
        seedSession(rows, token)

        // The response this rotation produced is thrown away - its Set-Cookie never lands.
        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: makeResponse() })

        // The reloaded page presents the consumed token again.
        const retry = makeResponse()
        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: retry })
        const [repaired] = cookieValues(retry)
        expect(repaired).toBeTruthy()
        expect(hashToken(repaired)).toBe(rows[0].refreshTokenHash)
        // Sized to the live token's remaining life, not a fresh full TTL.
        const [, , options] = retry.cookie.mock.calls.find((c) => c[0] === 'refresh_token')
        expect(options.maxAge).toBeLessThanOrEqual(rows[0].refreshTokenExpiresAt.getTime() - Date.now() + 1000)

        // Long after the leeway, the repaired cookie is an ordinary live token.
        rows[0].previousRefreshTokenGraceUntil = new Date(Date.now() - 1000)
        const later = makeResponse()
        const result = await refreshSessionTokens({ refreshToken: repaired, request: { headers: {} }, response: later })
        expect(result.accessToken).toBeTruthy()
        expect(cookieValues(later)).toHaveLength(1)
        expect(rows[0].refreshTokenHash).toBe(hashToken(cookieValues(later)[0]))
    })

    test('a custom-domain proxy gets the re-delivered token in the body so it can repair its own copy', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-proxy'
        seedSession(rows, token)

        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: makeResponse(), exposeRefreshToken: true })
        const retry = makeResponse()
        const result = await refreshSessionTokens({
            refreshToken: token, request: { headers: {} }, response: retry, exposeRefreshToken: true,
        })

        expect(result.refreshToken).toBe(cookieValues(retry)[0])
        expect(hashToken(result.refreshToken)).toBe(rows[0].refreshTokenHash)
    })

    test('a grace replay never re-delivers a token that is not the stored one', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-replaced'
        seedSession(rows, token)

        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: makeResponse() })
        // The live hash was replaced some other way (e.g. a fresh mint) without clearing the
        // previous one - re-deriving from the consumed token no longer yields the live token.
        rows[0].refreshTokenHash = hashToken('some-unrelated-token')

        const retry = makeResponse()
        const result = await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: retry })
        expect(result.accessToken).toBeTruthy()
        expect(result.refreshToken).toBe('exists')
        expect(cookieValues(retry)).toHaveLength(0)
    })

    test('replaying a consumed token OUTSIDE the leeway is still rejected', async () => {
        process.env.AUTH_REFRESH_TOKEN_ROTATION_UNTIL_USED = '0'
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-expired-grace'
        seedSession(rows, token)

        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: makeResponse() })
        rows[0].previousRefreshTokenGraceUntil = new Date(Date.now() - 1000)

        const response = makeResponse()
        await expect(refreshSessionTokens({
            refreshToken: token, request: { headers: {} }, response,
        })).rejects.toMatchObject({ code: 401, message: 'Invalid refresh token', reason: 'invalid' })
        // Nothing can make it work again, so the client stops replaying it.
        expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object))
    })

    test('leeway 0 restores strict single-use', async () => {
        process.env.AUTH_REFRESH_TOKEN_ROTATION_LEEWAY_SECONDS = '0'
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-no-leeway'
        seedSession(rows, token)

        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: makeResponse() })

        await expect(refreshSessionTokens({
            refreshToken: token, request: { headers: {} }, response: makeResponse(),
        })).rejects.toMatchObject({ code: 401, message: 'Invalid refresh token' })
    })

    test('an ordinary sequential refresh still rotates to a new token', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-sequential'
        seedSession(rows, token)
        const before = rows[0].refreshTokenHash

        const response = makeResponse()
        const result = await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response })
        const issued = cookieValues(response)

        expect(issued).toHaveLength(1)
        expect(issued[0]).not.toBe(token)
        expect(rows[0].refreshTokenHash).not.toBe(before)
        expect(rows[0].refreshTokenHash).toBe(hashToken(issued[0]))
        expect(result.refreshToken).toBe('exists')
    })
})

// PEAKUB-391: the refresh token is a child of its _Session. When it is unusable but the caller
// still holds that live session's token, a new one is rebuilt instead of failing until re-login.
describe('refreshSessionTokens rebuild from a live session', () => {
    const SESSION_TOKEN = 'r:live-session-token'

    const strand = async (rows, token) => {
        // Rotate once and lose the response, then let the leeway close: the browser now holds a
        // token that matches nothing, exactly the state PEAKUB-391 was reproduced in.
        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: makeResponse() })
        rows[0].previousRefreshTokenGraceUntil = new Date(Date.now() - 1000)
    }

    const decodeSid = (accessToken) => JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString()).sid

    test('a stranded token plus the live session token rebuilds a working refresh token', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-stranded'
        seedSession(rows, token, { sessionToken: SESSION_TOKEN, expiresAt: new Date(Date.now() + 90 * 86400000) })
        await strand(rows, token)

        const response = makeResponse()
        const result = await refreshSessionTokens({
            refreshToken: token, sessionToken: SESSION_TOKEN, request: { headers: {} }, response,
        })

        const [rebuilt] = cookieValues(response)
        expect(decodeSid(result.accessToken)).toBe('session-1')
        expect(hashToken(rebuilt)).toBe(rows[0].refreshTokenHash)
        expect(rows[0].previousRefreshTokenHash).toBeUndefined() // no grace for the stranded token
        expect(response.clearCookie).not.toHaveBeenCalled()

        // And it is an ordinary live token from then on.
        const next = makeResponse()
        await refreshSessionTokens({ refreshToken: rebuilt, request: { headers: {} }, response: next })
        expect(rows[0].refreshTokenHash).toBe(hashToken(cookieValues(next)[0]))
    })

    test('a missing refresh cookie is rebuilt from the live session too', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        seedSession(rows, 'seed-token-unused', { sessionToken: SESSION_TOKEN })

        const response = makeResponse()
        const result = await refreshSessionTokens({ sessionToken: SESSION_TOKEN, request: { headers: {} }, response })
        expect(result.accessToken).toBeTruthy()
        expect(hashToken(cookieValues(response)[0])).toBe(rows[0].refreshTokenHash)
    })

    test('the rebuilt token never outlives the _Session', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-short-session'
        seedSession(rows, token, { sessionToken: SESSION_TOKEN, expiresAt: new Date(Date.now() + 3600 * 1000) })
        await strand(rows, token)

        const response = makeResponse()
        const result = await refreshSessionTokens({
            refreshToken: token, sessionToken: SESSION_TOKEN, request: { headers: {} }, response,
        })
        expect(result.refreshTokenExpiresIn).toBeLessThanOrEqual(3600)
        expect(rows[0].refreshTokenExpiresAt.getTime()).toBeLessThanOrEqual(rows[0].expiresAt.getTime())
        const [, , options] = response.cookie.mock.calls.find((c) => c[0] === 'refresh_token')
        expect(options.maxAge).toBeLessThanOrEqual(3600 * 1000)
    })

    test('without a session token, a stranded token is rejected and its cookie cleared', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-no-session'
        seedSession(rows, token, { sessionToken: SESSION_TOKEN })
        await strand(rows, token)
        const hashBefore = rows[0].refreshTokenHash

        const response = makeResponse()
        await expect(refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response }))
            .rejects.toMatchObject({ code: 401, reason: 'invalid' })
        expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object))
        expect(cookieValues(response)).toHaveLength(0)
        expect(rows[0].refreshTokenHash).toBe(hashBefore) // the live chain is untouched
    })

    test.each([
        ['an unknown session token', { sessionToken: 'r:someone-else' }, {}],
        ['an expired _Session', { sessionToken: SESSION_TOKEN }, { expiresAt: new Date(Date.now() - 1000) }],
        ['a _Session bound to another device', { sessionToken: SESSION_TOKEN, installationId: 'device-B' }, { installationId: 'device-A' }],
    ])('%s does not rebuild', async (_label, callArgs, sessionExtra) => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-refused'
        seedSession(rows, token, { sessionToken: SESSION_TOKEN, ...sessionExtra })
        // Strand without device binding in the way - the rotation itself is not what's tested.
        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: makeResponse() })
        rows[0].previousRefreshTokenGraceUntil = new Date(Date.now() - 1000)

        const response = makeResponse()
        await expect(refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response, ...callArgs }))
            .rejects.toMatchObject({ code: 401, reason: 'invalid' })
        expect(cookieValues(response)).toHaveLength(0)
        expect(response.clearCookie).toHaveBeenCalled()
    })

    test('two tabs arriving with the same stranded cookie at once rebuild the SAME token', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-two-tabs'
        seedSession(rows, token, { sessionToken: SESSION_TOKEN })
        await strand(rows, token)

        const a = makeResponse()
        const b = makeResponse()
        await Promise.all([
            refreshSessionTokens({ refreshToken: token, sessionToken: SESSION_TOKEN, request: { headers: {} }, response: a }),
            refreshSessionTokens({ refreshToken: token, sessionToken: SESSION_TOKEN, request: { headers: {} }, response: b }),
        ])
        expect(cookieValues(a)[0]).toBe(cookieValues(b)[0])
        expect(rows[0].refreshTokenHash).toBe(hashToken(cookieValues(a)[0]))
    })

    test('a later rebuild never re-issues a token that was already handed out', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        seedSession(rows, 'seed-token-resurrect', { sessionToken: SESSION_TOKEN })

        const first = makeResponse()
        await refreshSessionTokens({ sessionToken: SESSION_TOKEN, request: { headers: {} }, response: first })
        const [firstRebuilt] = cookieValues(first)
        await refreshSessionTokens({ refreshToken: firstRebuilt, request: { headers: {} }, response: makeResponse() })

        // The cookie goes missing again later.
        const second = makeResponse()
        await refreshSessionTokens({ sessionToken: SESSION_TOKEN, request: { headers: {} }, response: second })
        expect(cookieValues(second)[0]).not.toBe(firstRebuilt)
    })

    test('a device-mismatched refresh token is not laundered through the same session', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-bound'
        seedSession(rows, token, { sessionToken: SESSION_TOKEN, installationId: 'device-A' })

        const response = makeResponse()
        await expect(refreshSessionTokens({
            refreshToken: token, sessionToken: SESSION_TOKEN, installationId: 'device-B', request: { headers: {} }, response,
        })).rejects.toMatchObject({ code: 401, reason: 'device_mismatch' })
        expect(cookieValues(response)).toHaveLength(0)
    })
})

// PEAKUB-391 step 5: by default the consumed token stays collectable until its successor is first
// used, not for a fixed 30s - a browser that lost a rotation's response and only comes back
// later (closed tab, laptop lid, dropped network) still collects the token it missed.
describe('refreshSessionTokens grace until the successor is used', () => {
    test('a rotation keeps the consumed token collectable until the successor expires', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        seedSession(rows, 'seed-token-until-used')

        await refreshSessionTokens({ refreshToken: 'seed-token-until-used', request: { headers: {} }, response: makeResponse() })
        expect(rows[0].previousRefreshTokenGraceUntil.getTime()).toBe(rows[0].refreshTokenExpiresAt.getTime())
    })

    test('a lost rotation response is still collected much later, as long as the successor was never used', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-came-back-later'
        seedSession(rows, token)

        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: makeResponse() })
        // Nothing to simulate: well past any 30s window, the grace still holds because the
        // successor has not been presented yet.
        const back = makeResponse()
        const result = await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: back })
        expect(result.accessToken).toBeTruthy()
        expect(hashToken(cookieValues(back)[0])).toBe(rows[0].refreshTokenHash)
    })

    test('once the successor is used, the consumed token is dead and the live chain is untouched', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-acknowledged'
        seedSession(rows, token)

        const first = makeResponse()
        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: first })
        const [successor] = cookieValues(first)
        const second = makeResponse()
        await refreshSessionTokens({ refreshToken: successor, request: { headers: {} }, response: second })
        const liveHash = rows[0].refreshTokenHash

        const replay = makeResponse()
        await expect(refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: replay }))
            .rejects.toMatchObject({ code: 401, reason: 'invalid' })
        expect(rows[0].refreshTokenHash).toBe(liveHash)
        // ...while the successor itself is now the collectable one, re-delivering what it rotated to.
        const again = makeResponse()
        await refreshSessionTokens({ refreshToken: successor, request: { headers: {} }, response: again })
        expect(cookieValues(again)).toEqual(cookieValues(second))
    })

    test('AUTH_REFRESH_TOKEN_ROTATION_UNTIL_USED=0 restores the fixed leeway', async () => {
        process.env.AUTH_REFRESH_TOKEN_ROTATION_UNTIL_USED = '0'
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        seedSession(rows, 'seed-token-fixed-leeway')

        const before = Date.now()
        await refreshSessionTokens({ refreshToken: 'seed-token-fixed-leeway', request: { headers: {} }, response: makeResponse() })
        const graceMs = rows[0].previousRefreshTokenGraceUntil.getTime() - before
        expect(graceMs).toBeGreaterThanOrEqual(29000)
        expect(graceMs).toBeLessThanOrEqual(31000)
    })
})
