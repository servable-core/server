export function recordTheOrphansHandled({ className, field, destroyed, failed }: {
    className?: string;
    field: string;
    destroyed?: number;
    failed?: number;
}): void;
