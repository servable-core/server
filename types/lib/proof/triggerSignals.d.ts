export function recordTheTriggerRun({ className, kind }: {
    className: string;
    kind: string;
}): void;
export function recordWhetherTheDirtyKeysAreMissing({ className, request }: {
    className: string;
    request: any;
}): boolean;
export function triggerPlanProofOf({ triggerPlans, isOnlyWhereHandled }: {
    triggerPlans: any[];
    isOnlyWhereHandled: boolean;
}): {
    proof: string;
    registered: any;
    kinds: number;
    classesWithoutAny: number;
    planHash: string;
    isOnlyWhereHandled: boolean;
};
export function reportTheTriggerPlan({ triggerPlans, isOnlyWhereHandled, logger }: {
    triggerPlans: any[];
    isOnlyWhereHandled: boolean;
    logger?: {
        info: (...args: any[]) => void;
    };
}): {
    proof: string;
    registered: any;
    kinds: number;
    classesWithoutAny: number;
    planHash: string;
    isOnlyWhereHandled: boolean;
};
