
export default async ({
  schema,
  servableConfig,
  config,
  protocol,
}) => {
  protocol.system = {
    ...(protocol.system ? protocol.system : {}),
    docker: config
  }
}
