declare function _default({ ParentClass }: {
    ParentClass: any;
}): {
    new (): {
        [x: string]: any;
        disposableOrphans(): any[];
        disposableChildren(): any[];
    };
    [x: string]: any;
};
export default _default;
