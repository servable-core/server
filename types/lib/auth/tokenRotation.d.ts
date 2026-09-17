export function generateToken(): string;
export function hashToken(token: any): string;
export function deriveRotatedToken(currentToken: any, secret: any): string;
export function validateRefreshToken(providedToken: any, storedHash: any): boolean;
export function createAccessToken({ userId, sessionId, expiresAt, secret }: {
    userId: any;
    sessionId: any;
    expiresAt: any;
    secret: any;
}): string;
export function verifyAccessToken({ token, secret }: {
    token: any;
    secret: any;
}): any;
