export default class ServableExpress {
    _app: any;
    _cache: (duration: any) => (req: any, res: any, next: any) => void;
    set app(value: any);
    get app(): any;
    set cache(value: (duration: any) => (req: any, res: any, next: any) => void);
    get cache(): (duration: any) => (req: any, res: any, next: any) => void;
}
