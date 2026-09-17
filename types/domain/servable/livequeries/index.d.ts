export default class LiveQueries {
    _items: any[];
    set items(value: any[]);
    get items(): any[];
    register({ liveQuery, protocol }: {
        liveQuery: any;
        protocol: any;
    }): Promise<void>;
}
