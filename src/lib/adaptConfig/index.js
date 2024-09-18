import basic from "./basic.js"

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
