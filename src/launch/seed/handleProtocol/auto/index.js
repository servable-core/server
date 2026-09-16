import { sha256, } from 'js-sha256'
import seedEntry from "./seedEntry/index.js"
import runTracked from "../../../../lib/stateStore/runTracked.js"

export default async ({ protocol, stateStore }) => {
  const { mode, type, id, files } = protocol

  const { transformer, data, validator, uniqueRef } = files
  if (!data || !transformer) {
    return
  }

  const dataSHA = sha256(JSON.stringify({
    data,
    transformer: transformer.toString(),
    validator: validator ? validator.toString() : null,
    uniqueRef: uniqueRef ? uniqueRef.toString() : null,
  }))

  await runTracked({
    stateStore,
    kind: 'seed',
    type,
    entityId: id,
    mode,
    dataSHA,
    run: async () => {
      await Promise.all(data.map(async entry => seedEntry({
        protocol,
        entry,
        transformer,
        validator,
        uniqueRef,
      })))

      return { fields: { dataCount: data.length } }
    },
  })
}
