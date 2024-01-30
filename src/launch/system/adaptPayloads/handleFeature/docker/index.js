import adaptAppFeature from "./adaptAppFeature.js"
import adaptGenericFeature from "./adaptGenericFeature.js"

export default async ({
  schema,
  servableConfig,
  item: feature
}) => {

  let payload
  const adaptPayloadProps = {
    config: feature.system.docker,
    item: feature,
    servableConfig,
    schema
  }

  const adaptPayload = await feature.loader.systemDockerPayloadAdapter()
  if (adaptPayload) {
    payload = await adaptPayload(adaptPayloadProps)
  }
  else if (feature.id === 'app') {
    payload = await adaptAppFeature(adaptPayloadProps)
  }
  else {
    payload = await adaptGenericFeature(adaptPayloadProps)
  }

  feature.system = {
    ...(feature.system ? feature.system : {}),
    payload
  }
}
