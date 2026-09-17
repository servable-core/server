declare const ServableConfigCondition_base: any;
export default class ServableConfigCondition extends ServableConfigCondition_base {
    [x: string]: any;
    disposableChildren(): any[];
    disposableOrphans: () => any[];
    isMet(props: any): Promise<boolean>;
    valueIsMet(props: any): Promise<any>;
}
export {};
