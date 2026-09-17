declare function _default({ protocol, servableConfig, }: {
    protocol: any;
    servableConfig: any;
}): Promise<{
    version: Record<string, string>;
    services: Record<string, string | Record<string, string>>;
    volumes: Record<string, string>;
}>;
export default _default;
