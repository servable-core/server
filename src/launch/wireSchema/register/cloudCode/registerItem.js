
export default async ({ key, item, prefix }) => {
  const name = prefix ? `${prefix}${capitalizeFirstLetter(key)}` : key
  Servable.App.Cloud.define(name, item)
}

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
