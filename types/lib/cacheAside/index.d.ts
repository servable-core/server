export function registerCacheClient(getClient: any, { timeoutMs }?: {
    timeoutMs?: number;
}): void;
export function cacheAside({ key, ttlSeconds, load, onOutcome }: {
    key: any;
    ttlSeconds: any;
    load: any;
    onOutcome: any;
}): Promise<any>;
export function forgetCachedKey(key: any): Promise<boolean>;
declare namespace _default {
    export { registerCacheClient };
    export { cacheAside };
    export { forgetCachedKey };
}
export default _default;
