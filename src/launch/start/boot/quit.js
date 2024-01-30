export default ({ delay, error }) => {
  setTimeout(() => {
    return process.exit(22)
  }, delay)
  throw (new Error(`Should quit server boot: ${error ? error.message : ''}`))
}
