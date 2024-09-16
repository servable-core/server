import basic from "./basic.js"
// import setConfigurations from "./setConfigurations/index.js"


export default ({
  servableConfig,
  payload,
  live,
  engine
}) => {
  // const { servableConfig, live = false } = props
  basic({
    servableConfig,
  })

  engine && engine.setConfigurations({
    servableConfig,
    payload,
    live,
    engine
  })
}
