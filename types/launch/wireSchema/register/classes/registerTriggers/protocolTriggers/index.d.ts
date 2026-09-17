export function beforeSave({ request, protocolInstance, allProtocols, protocol }: {
    request: any;
    protocolInstance: any;
    allProtocols: any;
    protocol: any;
}): Promise<void>;
export function afterSave({ request, allProtocols, protocol, protocolInstance }: {
    request: any;
    allProtocols: any;
    protocol: any;
    protocolInstance: any;
}): Promise<void>;
export function beforeDelete({ request, allProtocols, protocol, protocolInstance, }: {
    request: any;
    allProtocols: any;
    protocol: any;
    protocolInstance: any;
}): Promise<void>;
export function afterDelete({ request, allProtocols, protocol, protocolInstance, }: {
    request: any;
    allProtocols: any;
    protocol: any;
    protocolInstance: any;
}): Promise<void>;
export function beforeFind({ request, allProtocols, protocol, protocolInstance, }: {
    request: any;
    allProtocols: any;
    protocol: any;
    protocolInstance: any;
}): Promise<void>;
export function afterFind({ request, allProtocols, protocol, protocolInstance, }: {
    request: any;
    allProtocols: any;
    protocol: any;
    protocolInstance: any;
}): Promise<void>;
