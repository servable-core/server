import getPort from "get-port"

export default async ({ port, exclude, host }) => {
    return getPort({ port, exclude, host })
}
