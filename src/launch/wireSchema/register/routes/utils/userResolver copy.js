export default async ({
  request,
}) => {

  const userId = request.query.usersession
  if (!userId) {
    return userId
  }

  const query = new Servable.App.Query('_User')
  query.equalTo('objectId', userId)
  return query.first({ useMasterKey })
}
