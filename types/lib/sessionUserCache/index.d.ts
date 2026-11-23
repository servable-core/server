export const SESSION_USER_CACHE_DEFAULTS: Readonly<{
    isSessionUserCacheEnabled: true;
    sessionUserCacheTtlMilliseconds: number;
    sessionUserCacheMaxEntries: number;
}>;
export function hashedSessionTokenOf(sessionToken: string): string;
export function sessionUserCacheSettingsFrom({ serverConfiguration, env }?: {
    serverConfiguration?: Record<string, any>;
    env?: Record<string, string | undefined>;
}): {
    isSessionUserCacheEnabled: boolean;
    sessionUserCacheTtlMilliseconds: number;
    sessionUserCacheMaxEntries: number;
};
export function createSessionUserCache({ ttlMilliseconds, maxEntries, now }: {
    ttlMilliseconds: number;
    maxEntries: number;
    now?: () => number;
}): {
    /** What a lookup records before it starts, to hand back to `remember`. */
    invalidationCount: () => number;
    /**
     * @param {string} hash
     * @returns {ResolvedSession | null}
     */
    read: (hash: string) => ResolvedSession | null;
    /**
     * @param {string} hash
     * @param {ResolvedSession} session
     * @param {{ invalidationCountAtStart: number }} props
     * @returns {boolean} whether it was stored.
     */
    remember: (hash: string, session: ResolvedSession, { invalidationCountAtStart }: {
        invalidationCountAtStart: number;
    }) => boolean;
    /**
     * One report of the engine (`Servable.App.SessionInvalidations`).
     * @param {{ sessionToken?: string, sessionId?: string, userId?: string, isEverything?: boolean }} invalidation
     */
    forget: (invalidation?: {
        sessionToken?: string;
        sessionId?: string;
        userId?: string;
        isEverything?: boolean;
    }) => void;
    size: () => number;
};
export function userSnapshotOf(user: any): any;
export function userFromSnapshot(userSnapshot: any): any;
export function sessionUserCacheOfThisProcess({ servable, env }?: {
    servable?: any;
    env?: Record<string, string | undefined>;
}): Promise<ReturnType<typeof createSessionUserCache> | null>;
export function resetSessionUserCacheOfThisProcessForTests(): void;
export type ResolvedSession = {
    /**
     * - the `_Session`'s id.
     */
    sessionId: string;
    /**
     * - its user's id.
     */
    userId: string;
    /**
     * - when the session expires.
     */
    expiresAtMilliseconds: number;
    /**
     * - the device the session is bound to, if any.
     */
    installationId: string | null;
    /**
     * - how the session was made, for the logs.
     */
    createdWith: any;
    /**
     * - what the user is rebuilt from, for each request.
     */
    userSnapshot: any;
};
