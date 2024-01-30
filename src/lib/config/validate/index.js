import feature from "./feature/index.js"

export default async ({ items }) => {
  return Promise.all(items.map(item => feature({ item })))
}
