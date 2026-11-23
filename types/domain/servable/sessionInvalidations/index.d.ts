export namespace SessionInvalidationsContract {
    function subscribe(_listener: (invalidation: {
        sessionToken?: string;
        sessionId?: string;
        userId?: string;
        isEverything?: boolean;
    }) => void): Promise<{
        isReported: boolean;
        reason?: string;
        unsubscribe: () => void;
    }>;
}
export default SessionInvalidationsContract;
