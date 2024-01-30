export default async ({ route }) => {
  return route && route.handler && !route.disabled
}
