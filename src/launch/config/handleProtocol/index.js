import ConfigStateEnum from "../../../lib/utilsDatabase/classes/configState/enums/configState.js"
import { sha256, } from 'js-sha256'
// import files from "./files"

import handleServableConfig from './servableConfig/index.js'
import handleServableConfigCondition from "./servableConfigCondition/index.js"
import stateIfNeeded from "../../../lib/utilsDatabase/classes/configState/functions/stateIfNeeded.js"
import handleServableConfigGroup from './servableConfigGroup/index.js'
import handleServableConfigEntry from './servableConfigEntry/index.js'
import validate from '../../../lib/config/validate/protocol/index.js'

export default async ({ candidate, configuration }) => {

  const { mode, type, id, files, protocol, path } = candidate
  const { isValid, message } = await validate({ item: candidate })

  if (!isValid) {
    throw (new error(`The config is not valid ${message}`))
  }

  const stateItem = await stateIfNeeded({ entityId: id, type, configuration })
  stateItem.mode = mode

  //const { entries, conditions, groups, } = result
  const dataSHA = sha256(JSON.stringify(files))

  switch (stateItem.state) {
    case ConfigStateEnum.Initial: {

    } break
    case ConfigStateEnum.Loading: {
      break
    }
    case ConfigStateEnum.LoadedSuccessfully: {
      if (stateItem.dataSHA === dataSHA) {
        return
      }
      break
    }
    case ConfigStateEnum.ErrorLoading: {

    } break
    default: {

    } break
  }

  stateItem.state = ConfigStateEnum.Loading
  stateItem.updatedAt = Date.now()
  await stateItem.save()

  try {

    const servableConfig = await handleServableConfig({
      protocol,
    })
    if (!servableConfig) {
      return
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

    stateItem.dataSHA = dataSHA
    // stateItem.dataCount = data.length
    stateItem.state = ConfigStateEnum.LoadedSuccessfully
    stateItem.updatedAt = Date.now()
    await stateItem.save()

  } catch (e) {
    console.error(e)
    stateItem.state = ConfigStateEnum.ErrorLoading
    stateItem.updatedAt = Date.now()
    await stateItem.save()
    throw e
  }
}
