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
