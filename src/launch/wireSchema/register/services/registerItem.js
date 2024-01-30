import validate from './validate.js'

export default async ({
  service,
  feature }) => {

  if (!validate({ service })) {
    return
  }

  Servable.Services.register({ service, feature })
}
