declare function _default({ refreshToken, request, response, cookieDomain, exposeRefreshToken, installationId, sessionToken, }: {
    refreshToken: any;
    request: any;
    response: any;
    cookieDomain: any;
    exposeRefreshToken?: boolean;
    installationId: any;
    sessionToken: any;
}): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    refreshTokenExpiresIn: any;
}>;
export default _default;
