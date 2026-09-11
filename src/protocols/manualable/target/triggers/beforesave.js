import setup from "../../lib/setup.js"

export default async ({ request }) => {
  const { object, context, user, } = request
  const { manualableMode } = context
  // console.log("[Servable]", 'seed', manualableMode)
  // switch (manualableMode) {
  //     case 'auto': break
  //     default: {
  //         object.set('manualableMode', 'manual')
  //     } break
  // }

  await setup({ object })
}
