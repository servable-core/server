import didMigrateStepSuccessfully from '../../launchers/auxiliary/didMigrateStepSuccessfully/index.js'
import { buildSchema } from '@servable/tools'
// import { buildSchema } from '../../../../../../manifest/src/index.js'
import handleTask from './handleTask.js'

export default async (props) => {
  const { servableConfig,
    migrationPayload,
    configuration,
    app,
    frameworkBridge } = props

  let schema = props.schema
  let i = 0
  let result
  do {
    const {
      direction,
      feature,
      operations
    } = migrationPayload[i]

    for (var j in operations) {
      const operation = operations[j]
      const { featuresExcerpt } = schema
      await handleTask({
        operation,
        direction,
        taskProps: {
          featuresExcerpt,
          configuration,
        }
      })


      let _servableConfig = { ...servableConfig, versions: {} }
      _servableConfig.versions[feature.id] = operation.version
      schema = await buildSchema({ servableConfig: _servableConfig })
      //#TODO:
      // const { isValid, issues, message } = await validateSchema({ schema: staticSchema })
      // if (!isValid) {
      //   throw new Error(message)
      // }

      if (!schema) {
        continue
      }

      result = await frameworkBridge.launchWithMigration({ schema, configuration, app })
      await didMigrateStepSuccessfully({
        configuration,
        schema
      })
    }
    i++
  } while (i < migrationPayload.length)

  return { ...result, schema }
}
