import { sha256, } from 'js-sha256'

import handleServableConfig from './servableConfig/index.js'
import handleServableConfigCondition from "./servableConfigCondition/index.js"
import handleServableConfigGroup from './servableConfigGroup/index.js'
import handleServableConfigEntry from './servableConfigEntry/index.js'
import validate from '../../../lib/config/validate/protocol/index.js'
import runTracked from '../../../lib/stateStore/runTracked.js'

export default async ({ candidate, stateStore }) => {

  const { mode, type, id, files, protocol } = candidate
  const { isValid, message } = await validate({ item: candidate })

  if (!isValid) {
    throw new Error(`The config is not valid ${message}`)
  }

  const dataSHA = sha256(JSON.stringify(files))

  await runTracked({
    stateStore,
    kind: 'config',
    type,
    entityId: id,
    mode,
    dataSHA,
    run: async () => {
      const servableConfig = await handleServableConfig({
        protocol,
      })
      if (!servableConfig) {
        return { completed: false }
      }

      const conditions = await Promise.all(files.conditions.map(async condition => handleServableConfigCondition({
        item: condition,
        servableConfig,
      })))
      servableConfig.set('conditions', conditions)
      await servableConfig.save(null, { useMasterKey: true })

      const groups = await Promise.all(files.groups.map(async group => handleServableConfigGroup({
        item: group,
        servableConfig,
      })))
      servableConfig.set('groups', groups)
      await servableConfig.save(null, { useMasterKey: true })

      const entries = await Promise.all(files.entries.map(async entry => handleServableConfigEntry({
        item: entry,
        servableConfig,
        groups,
        conditions,
        candidate
      })))

      servableConfig.set('entries', entries)
      await servableConfig.save(null, { useMasterKey: true })
    },
  })
}
