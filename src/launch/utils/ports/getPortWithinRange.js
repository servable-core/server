import getPort, { portNumbers } from 'get-port'

export default async ({ start, end, exclude, host }) => {
    return getPort({ port: portNumbers(start, end,), exclude, host })
}
