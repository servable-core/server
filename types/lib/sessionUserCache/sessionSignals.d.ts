export function recordTheSessionResolution({ path, result }: {
    path: string;
    result: string;
}): void;
export namespace sessionUserCacheSignals {
    function remembered(outcome: "stored" | "refused_invalidated" | "refused_invalid"): void;
    function invalidated(kind: "token" | "session" | "user" | "everything"): void;
    function sized(size: number): void;
}
