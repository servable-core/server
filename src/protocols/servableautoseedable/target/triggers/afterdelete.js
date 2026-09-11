import tearDown from "../../lib/tearDown.js"

export default async ({ request }) => {
  const { object } = request
  await tearDown({ object })
}
