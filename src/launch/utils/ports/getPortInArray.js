import getPort from "get-port"

export default async ({ candidates, exclude, host }) => {
    return getPort({ port: candidates, exclude, host })
}
