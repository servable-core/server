import basic from "./basic.js"

/**
 * @param {object} props
 * @param {object} props.servableConfig
 * @param {boolean} [props.live] - forwarded to `engine.setConfigurations()` only; `launch()`
 *   omits this on its first call (before `launchSystem()` has resolved dynamic connection
 *   details) and passes `true` on its second.
 * @param {object} [props.engine] - if omitted, only the basic defaulting pass runs.
 */
export default ({
  servableConfig,
  live,
  engine
}) => {
  // const { servableConfig, live = false } = props
  basic({
    servableConfig,
  })

  engine && engine.setConfigurations({
    servableConfig,
    live,
    engine
  })
}
