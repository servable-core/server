export default class Operations {
    _throttleGroups: any[];
    set throttleGroups(value: any[]);
    get throttleGroups(): any[];
    /**
     * @param {object} props
     * @param {string} [props.id] - accepted for parity with `execute()`'s call shape; unused -
     *   the actual throttle-group identity comes from `throttle.groupName`.
     * @param {{ groupName: string, maxConcurrent: number, minTime?: number }} props.throttle
     * @param {() => any} props.operation
     */
    executeThrottle({ id, throttle, operation, }: {
        id?: string;
        throttle: {
            groupName: string;
            maxConcurrent: number;
            minTime?: number;
        };
        operation: () => any;
    }): Promise<any>;
    /**
     * @param {object} props
     * @param {string} [props.id] - forwarded to `executeThrottle` (and the Jobs cron path) as
     *   the throttle-group/job identity; unused otherwise.
     * @param {{ groupName: string, maxConcurrent: number, minTime?: number }} [props.throttle] -
     *   run `operation` through a named, concurrency-limited queue instead of immediately.
     * @param {string} [props.cron] - a cron expression; if set, `operation` is scheduled via
     *   `Servable.App.Jobs.define()` instead of run inline.
     * @param {() => any} props.operation - the work to run (or throttle/schedule).
     */
    execute({ id, throttle, cron, operation, }: {
        id?: string;
        throttle?: {
            groupName: string;
            maxConcurrent: number;
            minTime?: number;
        };
        cron?: string;
        operation: () => any;
    }): Promise<any>;
}
