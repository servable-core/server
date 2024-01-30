import handleFeature from './handleFeature/index.js'
import candidates from '../../lib/config/candidates/index.js'

export default async ({ schema, configuration }) => {
  console.log("[Servable]", `Launch > Config > Start`)
  const items = await candidates({ schema })

  for (var i in items) {
    const candidate = items[i]
    await handleFeature({ candidate, configuration, })
  }

  console.log("[Servable]", `Launch > Config > End`)
}
