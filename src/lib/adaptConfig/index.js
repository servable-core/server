import basic from "./basic.js"
// import setConfigurations from "./setConfigurations/index.js"


export default (props) => {
  // const { servableConfig, live = false } = props
  basic(props)
  props.engine.setConfigurations(props)
}
