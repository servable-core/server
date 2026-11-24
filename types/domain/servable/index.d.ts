export default class Servable {
    _process: any;
    _express: any;
    _schema: any;
    _httpServer: any;
    _servableConfig: any;
    _config: {};
    _engine: any;
    set Process(value: any);
    get Process(): any;
    get RequestScope(): {
        runInNewRequestScope: (work: any) => any;
        runInRequestScopeOf: ({ nativeRequest, nativeResponse, work }: {
            nativeRequest: any;
            nativeResponse: any;
            work: any;
        }) => any;
        currentRequestScope: () => any;
        hasRequestScope: () => boolean;
        requestMemo: ({ key, load }: {
            key: any;
            load: any;
        }) => any;
        createBatchLoader: ({ name, batchLoad, maxBatchSize }: {
            name: any;
            batchLoad: any;
            maxBatchSize?: number;
        }) => any;
        requestSignal: () => any;
        isRequestAborted: () => boolean;
        throwIfRequestAborted: () => void;
        isRequestAbortedError: (error: any) => boolean;
        RequestAbortedError: typeof import("../../lib/requestScope/index.js").RequestAbortedError;
    };
    requestMemo(options: any): any;
    createBatchLoader(options: any): any;
    requestSignal(): any;
    isRequestAborted(): boolean;
    throwIfRequestAborted(): void;
    registerCacheClient(getClient: any, options: any): void;
    cacheAside(options: any): Promise<any>;
    forgetCachedKey(key: any): Promise<boolean>;
    set Services(value: any);
    get Services(): any;
    _services: any;
    set LiveQueries(value: any);
    get LiveQueries(): any;
    _liveQueries: any;
    set Operations(value: any);
    get Operations(): any;
    _operations: any;
    set Express(value: any);
    get Express(): any;
    set schema(value: any);
    get schema(): any;
    set Config(value: {});
    get Config(): {};
    set ServableConfig(value: any);
    get ServableConfig(): any;
    set engine(value: any);
    get engine(): any;
    App: {};
    hydrate({ servableConfig, engine, app }: {
        servableConfig: any;
        engine: any;
        app: any;
    }): Promise<void>;
    Console: Console;
    AppNative: any;
}
