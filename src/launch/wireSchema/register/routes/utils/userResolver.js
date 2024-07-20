import axios from "axios"

export default async ({
  request,
  options
}) => {

  const { usersession, } = request.query

  if (!usersession) {
    return null
  }

  const url = `${process.env.SERVABLE_PUBLIC_SERVER_URL}${process.env.SERVABLE_MOUNT}/users/me`

  try {
    const result = await axios({
      method: "GET",
      url,
      headers: {
        "content-type": "application/json",
        "X-Parse-Application-Id": process.env.SERVABLE_APP_ID,
        "X-Parse-Session-Token": usersession,
        "X-Parse-Master-Key": process.env.SERVABLE_MASTER_KEY
      },
      params: {
        // include
        // Where: JSON.stringify({ "post": { "$inQuery": { "where": { "image": { "$exists": true } }, "className": "Post" } } })
      }
    })

    return Parse.Object.fromJSON(result.data)
  } catch (e) {
    console.error(e)
    return null
  }
}
