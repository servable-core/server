import validate from './validate.js'

export default async ({
  liveQuery,
  protocol }) => {

  if (!validate({ liveQuery })) {
    return
  }

  await Servable.LiveQueries.register({ liveQuery, protocol })
}
