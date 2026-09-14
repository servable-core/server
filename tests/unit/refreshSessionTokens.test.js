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
        expect(cookieValues(second)).toHaveLength(0)      // no competing token issued
        expect(second.clearCookie).not.toHaveBeenCalled() // and not signed out
        expect(rows[0].refreshTokenHash).toBe(hashAfterRotation) // nothing re-rotated
    })

    test('replaying a consumed token OUTSIDE the leeway is still rejected', async () => {
        const { rows, FakeQuery } = makeStore()
        global.Servable = { App: { Query: FakeQuery } }
        const token = 'seed-token-expired-grace'
        seedSession(rows, token)

        await refreshSessionTokens({ refreshToken: token, request: { headers: {} }, response: makeResponse() })
        rows[0].previousRefreshTokenGraceUntil = new Date(Date.now() - 1000)

        await expect(refreshSessionTokens({
            refreshToken: token, request: { headers: {} }, response: makeResponse(),
        })).rejects.toMatchObject({ code: 401, message: 'Invalid refresh token' })
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
