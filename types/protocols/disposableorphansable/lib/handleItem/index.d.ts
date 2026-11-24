declare function _default({ object, field }: {
    object: any;
    field: any;
}): Promise<Readonly<{
    destroyed: 0;
    failed: 0;
}> | {
    destroyed: any;
    failed: any;
}>;
export default _default;
