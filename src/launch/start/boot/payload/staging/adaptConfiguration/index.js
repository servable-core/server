import database from "./database.js"

export default async (props) => {
  let result = await database(props)
  return result
}
