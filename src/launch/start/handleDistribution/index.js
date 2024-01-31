// import pingPeriodically from '../../../utils/utilsDatabase/classes/parseServerInstance/functions/pingPeriodically.js'
// import watchServer from './watch/index.js'


export default async ({ launchedServer, servableConfig }) => {

  const { configuration } = launchedServer
  const { distribution } = servableConfig
  if (!distribution || !distribution.enabled) {
    return
  }

  // await pingPeriodically({ configuration })
  // await watchServer({ performProps: props, configuration })
}
