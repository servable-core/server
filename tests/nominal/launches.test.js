import { launchServable } from "../../src"

test('servable launches', async () => {

  const servableConfig =
  {
    id: 'test-app'
  }

  await launchServable({ servableConfig })
})
