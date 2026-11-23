export const TRIGGER_KINDS: string[];
export const TRIGGER_REGISTRATION_ENVIRONMENT_VARIABLE: "SERVABLE_TRIGGERS_ONLY_WHERE_HANDLED";
export function booleanFromEnvironmentValue(rawValue: unknown): boolean | undefined;
export function areTriggersRegisteredOnlyWhereHandledFor({ servableConfig, env }?: {
    servableConfig?: any;
    env?: Record<string, string | undefined>;
}): boolean;
export function triggerFilesResolverFor(allProtocols: any[]): (protocolId: string) => Promise<{
    triggers: any;
    metadata: any;
} | null>;
export function protocolOperationsOf({ classProtocols, operationName, resolveTriggerFiles, warn }: {
    classProtocols: any[];
    operationName: string;
    resolveTriggerFiles: (protocolId: string) => Promise<{
        triggers: any;
        metadata: any;
    } | null>;
    warn?: (warning: string) => void;
}): Promise<Array<{
    protocolId: string;
    protocolPayload: any;
    operation: Function;
}>>;
export function classHookNamesOf(classTriggers: any, operationName: string): string[];
export function buildClassTriggerPlan({ className, protocol, allProtocols, classTriggers, areRegisteredOnlyWhereHandled, warn, }: {
    className: string;
    protocol: any;
    allProtocols: any[];
    classTriggers: any;
    areRegisteredOnlyWhereHandled?: boolean;
    warn?: (warning: string) => void;
}): Promise<{
    className: string;
    protocolId: any;
    kinds: {};
    registeredKinds: string[];
}>;
export default buildClassTriggerPlan;
