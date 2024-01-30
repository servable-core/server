import stateIfNeeded from "../../../../lib/utilsDatabase/classes/seedState/functions/stateIfNeeded.js"
import SeedStateEnum from "../../../../lib/utilsDatabase/classes/seedState/enums/seedState.js"
import { sha256, } from 'js-sha256'
// import files from "./files"
import seedEntry from "./seedEntry/index.js"


export default async ({ feature, configuration }) => {
  const { mode, type, id, files } = feature

  const stateItem = await stateIfNeeded({ entityId: id, type, configuration })
  stateItem.mode = mode

  const result = files
  const { transformer, data, validator, uniqueRef } = result
  if (!data || !transformer) {
    return
  }
  const dataSHA = sha256(JSON.stringify({
    data,
    transformer: transformer.toString(),
    validator: validator ? validator.toString() : null,
    uniqueRef: uniqueRef ? uniqueRef.toString() : null,
  }))

  switch (stateItem.state) {
    case SeedStateEnum.Initial: {

    } break
    case SeedStateEnum.Loading: {
      break
    }
    case SeedStateEnum.LoadedSuccessfully: {
      if (stateItem.dataSHA === dataSHA) {
        return
      }
      break
    }
    case SeedStateEnum.ErrorLoading: {

    } break
    default: {

    } break
  }

  stateItem.state = SeedStateEnum.Loading
  stateItem.updatedAt = Date.now()
  await stateItem.save()

  try {
    await Promise.all(data.map(async entry => seedEntry({
      feature,
      entry,
      transformer: result.transformer,
      validator: result.validator,
      uniqueRef: result.uniqueRef,
    })))

    stateItem.dataSHA = dataSHA
    stateItem.dataCount = data.length
    stateItem.state = SeedStateEnum.LoadedSuccessfully
    stateItem.updatedAt = Date.now()
    await stateItem.save()

  } catch (e) {
    console.error(e)
    stateItem.state = SeedStateEnum.ErrorLoading
    stateItem.updatedAt = Date.now()
    await stateItem.save()
    throw e
  }
}
