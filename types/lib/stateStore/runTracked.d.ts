declare function _default({ stateStore, kind, type, entityId, mode, dataSHA, run }: {
    stateStore: any;
    kind: any;
    type: any;
    entityId: any;
    mode: any;
    dataSHA: any;
    run: any;
}): Promise<{
    skipped: boolean;
    completed?: undefined;
} | {
    skipped: boolean;
    completed: boolean;
}>;
export default _default;
