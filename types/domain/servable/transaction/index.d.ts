export default class ServableTransaction {
    constructor(options?: {});
    _state: string;
    _token: any;
    _options: {};
    _writes: number;
    get state(): string;
    get token(): any;
    get options(): {};
    get writes(): number;
    _assertOpen(): void;
    /** @param {{ context?: Record<string, any>, [key: string]: any }} [options] */
    toWriteOptions(options?: {
        context?: Record<string, any>;
        [key: string]: any;
    }): {
        context: {
            servableTransactionToken: any;
        };
        transaction: boolean;
    };
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
