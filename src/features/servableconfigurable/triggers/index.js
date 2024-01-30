import setup from "../lib/setup.js"
import completeSetup from "../lib/completeSetup.js"
import tearDown from "../lib/tearDown.js"

export const afterDelete = async ({ request }) => {
  const { object } = request
  await tearDown({ object })
}

export const beforeSave = async ({ request }) => {
  const { object } = request
  await setup({ object })
}

export const afterSave = async ({ request }) => {
  const { object } = request
  await completeSetup({ object })
}
