export function beforeSave({ request, protocolInstance, protocol, kindPlan }: {
    request: any;
    protocolInstance: any;
    protocol: any;
    kindPlan: any;
}): Promise<void>;
export function afterSave({ request, protocol, protocolInstance, kindPlan }: {
    request: any;
    protocol: any;
    protocolInstance: any;
    kindPlan: any;
}): Promise<void>;
export function beforeDelete({ request, protocol, protocolInstance, kindPlan }: {
    request: any;
    protocol: any;
    protocolInstance: any;
    kindPlan: any;
}): Promise<void>;
export function afterDelete({ request, protocol, protocolInstance, kindPlan }: {
    request: any;
    protocol: any;
    protocolInstance: any;
    kindPlan: any;
}): Promise<void>;
