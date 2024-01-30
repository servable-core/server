import ping from "./ping.js"

export default async (props) => {
  const { delay = 5000 } = props
  loopInfinitely({
    delay,
    fn: async () => ping(props)
  })
}

const loopInfinitely = async (props) => {
  const { delay, fn } = props
  setTimeout(async () => {
    await fn()
    loopInfinitely(props)
  }, delay)
}
