export class RequestAbortedError extends Error {
    constructor(message?: string);
    isRequestAborted: boolean;
}
export function createRequestScope(): {
    memoPromisesByKey: Map<any, any>;
    batchLoadersByName: Map<any, any>;
    abortController: AbortController;
};
export function currentRequestScope(): any;
export function hasRequestScope(): boolean;
export function runInNewRequestScope(work: any): any;
export function runInRequestScopeOf({ nativeRequest, nativeResponse, work }: {
    nativeRequest: any;
    nativeResponse: any;
    work: any;
}): any;
export function requestSignal(): any;
export function isRequestAborted(): boolean;
export function throwIfRequestAborted(): void;
export function isRequestAbortedError(error: any): boolean;
export function requestMemo({ key, load }: {
    key: any;
    load: any;
}): any;
export function createBatchLoader({ name, batchLoad, maxBatchSize }: {
    name: any;
    batchLoad: any;
    maxBatchSize?: number;
}): any;
declare namespace _default {
    export { runInNewRequestScope };
    export { runInRequestScopeOf };
    export { currentRequestScope };
    export { hasRequestScope };
    export { requestMemo };
    export { createBatchLoader };
    export { requestSignal };
    export { isRequestAborted };
    export { throwIfRequestAborted };
    export { isRequestAbortedError };
    export { RequestAbortedError };
}
export default _default;
