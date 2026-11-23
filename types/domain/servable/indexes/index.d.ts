export namespace IndexesContract {
    function ensure(props: {
        className: string;
        name: string;
        keys: Record<string, 1 | -1>;
        isUnique?: boolean;
        isSparse?: boolean;
        partialFilter?: Record<string, any>;
        fieldTypes?: Record<string, any>;
    }): Promise<{
        isEnsured: boolean;
        className: string;
        name: string;
        reason?: string;
    }>;
}
export default IndexesContract;
