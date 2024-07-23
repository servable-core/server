import validate from './validate.js'

export default async ({
  liveQuery,
  feature }) => {

  if (!validate({ liveQuery })) {
    return
  }

  await Servable.LiveQueries.register({ liveQuery, feature })
}
