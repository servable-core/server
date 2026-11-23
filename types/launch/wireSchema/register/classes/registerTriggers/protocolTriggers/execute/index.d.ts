declare function _default({ protocol, request, operationName, protocolInstance, protocolOperations, }: {
    request: any;
    operationName: string;
    protocolOperations: Array<{
        protocolId: string;
        protocolPayload: any;
        operation: Function;
    }>;
    protocol: any;
    protocolInstance?: any;
}): Promise<void>;
export default _default;
