import setup from "../../lib/setup.js"

export default async ({ request }) => {
  const { object } = request
  await setup({ object })
}
