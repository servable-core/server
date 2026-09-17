declare namespace _default {
    namespace docker {
        function path(): string;
    }
    function adaptAppPayload({ protocol, config, servableConfig, schema }: {
        protocol: any;
        config: any;
        servableConfig: any;
        schema: any;
    }): Promise<{
        redisCacheUri?: undefined;
    } | {
        redisCacheUri: any;
    }>;
}
export default _default;
