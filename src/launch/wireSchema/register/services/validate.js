export default async ({ service }) => {
  return service && service.register && service.handler && !service.disabled
}
