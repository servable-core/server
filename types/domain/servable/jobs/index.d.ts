export const JOB_RUN_REFUSAL_CODES: Readonly<{
    jobNotFound: "jobNotFound";
    jobIsRunning: "jobIsRunning";
    paramsNotSupported: "paramsNotSupported";
    dryRunNotSupported: "dryRunNotSupported";
    asOfNotSupported: "asOfNotSupported";
    asOfNotADate: "asOfNotADate";
}>;
export const DEFAULT_JOB_LOCK_TTL_SECONDS: number;
export function refusalOfARunNow({ descriptor, params, asOf, isDryRun }: {
    descriptor: object;
    params?: Record<string, unknown>;
    asOf?: string | Date | null;
    isDryRun?: boolean;
}): object | null;
export function createJobsContract({ engineJobs, lockOfJobs }?: {
    engineJobs?: {
        define?: Function;
    } | null;
    lockOfJobs?: () => Function | null | undefined;
}): {
    define: Function;
    findJob: Function;
    listJobIds: Function;
    runNow: Function;
};
export default createJobsContract;
