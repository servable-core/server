import fill from "./fill.js"

export default async (props) => {

  const object = new Servable.App.Object('ServableConfigGroup')
  fill({ ...props, object })
  return object
}
