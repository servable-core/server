import completeSetup from "../../lib/completeSetup.js"

export default async ({ request }) => {
  const { object } = request
  await completeSetup({ object })
}
