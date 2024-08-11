import protocol from "./protocol/index.js"

export default async ({ items }) => {
  return Promise.all(items.map(item => protocol({ item })))
}
