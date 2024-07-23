export default async ({ liveQuery }) => {
  return liveQuery
    && liveQuery.query
    && !liveQuery.disabled
}
