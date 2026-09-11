import setup from "../../lib/setup.js"

export default async ({ request }) => {
  const { object, context, user, } = request
  const { seedFillMode } = context
  // console.log("[Servable]", 'seed', seedFillMode)
  // switch (seedFillMode) {
  //     case 'auto': break
  //     default: {
  //         object.set('seedFillMode', 'manual')
  //     } break
  // }

  await setup({ object })
}
