import getPort, { portNumbers } from 'get-port'

export default async ({ start, end, exclude, host }) => {
  //#TODO: Fix: TypeError: `from` and `to` must be integer numbers
  return getPort({ port: portNumbers(start, end,), exclude, host })
}
