export default async ({
  request,
}) => {
  const sessiontoken = request.headers['x-servable-session-token']
  if (!sessiontoken) {
    return null
  }

  try {
    const query = new Servable.App.Query('_Session')
      .equalTo("sessionToken", sessiontoken)
      .greaterThan("expiresAt", (new Date()))
      .include("user")

    const session = await query.first({ useMasterKey: true })
    if (!session) {
      return null
    }

    const user = session.get('user')
    if (!user) {
      return null
    }

    return user
  } catch (e) {
    console.error(e)
    return null
  }
}



// import axios from "axios"

// export default async ({
//   request,
//   options
// }) => {

//   const sessiontoken = request.headers['x-servable-session-token']
//   if (!sessiontoken) {
//     return null
//   }

//   const url = `${process.env.SERVABLE_PUBLIC_SERVER_URL}${process.env.SERVABLE_MOUNT}/users/me`

//   try {
//     const result = await axios({
//       method: "GET",
//       url,
//       headers: {
//         "content-type": "application/json",
//         "X-Parse-Application-Id": process.env.SERVABLE_APP_ID,
//         "X-Parse-Session-Token": sessiontoken,
//         "X-Parse-Master-Key": process.env.SERVABLE_MASTER_KEY
//       },
//       params: {
//         // include
//         // Where: JSON.stringify({ "post": { "$inQuery": { "where": { "image": { "$exists": true } }, "className": "Post" } } })
//       }
//     })

//     return Parse.Object.fromJSON(result.data)
//   } catch (e) {
//     console.error(e)
//     return null
//   }
// }
