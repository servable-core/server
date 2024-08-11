import fill from "./fill.js"

export default async (props) => {

  const object = new Servable.App.Object('ServableConfigEntry')
  await fill({ ...props, object })
  return object
}
