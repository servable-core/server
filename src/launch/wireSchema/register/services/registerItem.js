import validate from './validate.js'

export default async ({
  service,
  protocol }) => {

  if (!validate({ service })) {
    return
  }

  Servable.Services.register({ service, protocol })
}
