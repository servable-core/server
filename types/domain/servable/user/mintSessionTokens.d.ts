declare function _default({ user, sessionToken, request, response, rememberMe, cookieDomain, exposeRefreshToken, }: {
    user: any;
    sessionToken: any;
    request: any;
    response: any;
    rememberMe?: boolean;
    cookieDomain: any;
    exposeRefreshToken?: boolean;
}): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    refreshTokenExpiresIn: any;
}>;
export default _default;
