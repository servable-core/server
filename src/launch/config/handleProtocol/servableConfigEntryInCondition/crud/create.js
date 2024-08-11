import fill from "./fill.js"

export default async (props) => {

  const object = new Servable.App.Object('ServableConfigEntryInCondition')
  fill({ ...props, object })
  return object
}
