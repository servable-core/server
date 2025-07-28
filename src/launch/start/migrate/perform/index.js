import didMigrateStepSuccessfully from '../../launchers/auxiliary/didMigrateStepSuccessfully/index.js'
import { buildSchema } from '@servable/tools'
// import { buildSchema } from '../../../../../../tools/src/index.js'
import handleTask from './handleTask.js'

export default async (props) => {
  const { servableConfig,
    migrationPayload,
    configuration,
    app,
    engine } = props

  let schema = props.schema
  let i = 0
  let result
  do {
    const {
      direction,
      protocol,
      operations
    } = migrationPayload[i]

    for (var j in operations) {
      const operation = operations[j]
      const { protocolsExcerpt } = schema
      await handleTask({
        operation,
        direction,
        taskProps: {
          protocolsExcerpt,
          configuration,
        }
      })


      let _servableConfig = { ...servableConfig, versions: {} }
      _servableConfig.versions[protocol.id] = operation.version
      schema = await buildSchema({ servableConfig: _servableConfig })
      //#TODO:
      // const { isValid, issues, message } = await validateSchema({ schema: staticSchema })
      // if (!isValid) {
      //   throw new Error(message)
      // }

      if (!schema) {
        continue
      }

      result = await engine.launchWithMigration({ schema, configuration, app })
      await didMigrateStepSuccessfully({
        configuration,
        schema
      })
    }
    i++
  } while (i < migrationPayload.length)

  return { ...result, schema }
}
