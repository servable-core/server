//#TODO
import duplicate from "../../../../../../utils/mongo/duplicate.js"
import tearDown from "../../tearDown/index.js"

export default async (props) => {
  const {
    configuration,
  } = props

  try {
    const { config: { parse } } = configuration
    await tearDown(props)

    return await duplicate({
      sourceUri: parse.sourceDatabaseURI,
      targetUri: parse.databaseURI,
    })

  } catch (e) {
    return e
  }
}
