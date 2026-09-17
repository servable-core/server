export default class Intercom {
    _items: any[];
    set items(value: any[]);
    get items(): any[];
    register({ service, protocol }: {
        service: any;
        protocol: any;
    }): Promise<void>;
    call({ id, version, params, }: {
        id: any;
        version?: string;
        params: any;
    }): Promise<any>;
}
