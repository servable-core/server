declare function _default(): {
    accessTokenTTL: number;
    refreshTokenTTL: number;
    refreshTokenTTLRememberMe: number;
    jwtSecret: any;
    deviceBindingEnabled: boolean;
    legacySessionDeviceBindingEnabled: boolean;
    refreshTokenRotationLeewaySeconds: number;
    stepUpFreshnessSeconds: number;
};
export default _default;
export function getRefreshTokenTTL(rememberMe: any, config: any): any;
