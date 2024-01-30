import fill from "./fill.js"

export default async (props) => {

  const object = new Servable.App.Object('ServableConfigCondition')
  fill({ ...props, object })
  return object
}
