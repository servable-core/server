import ejs from 'ejs'

// Same job as adaptEnvironmentVariable.js/adaptCommand.js - render <%= %> placeholders against
// process.env/servableConfig.envs - but for healthcheck.test, which adaptService.js never passed
// through either adapter (only volumes/environment were spread into the returned service; a
// commented-out adaptCommand call shows command was at least attempted once). A healthcheck like
// `pg_isready -U <%= LOCAL_SYSTEM_LEDGER_DB_USER %> -d <%= LOCAL_SYSTEM_LEDGER_DB_NAME %>` was
// passed to Docker completely unrendered - the literal `<%= %>` tags in the shell command, which
// /bin/sh then fails on with a syntax error, on every healthcheck probe.
export default async (props) => {
  const {
    healthcheck,
    servableConfig
  } = props
  if (!healthcheck || !healthcheck.test) {
    return healthcheck
  }

  const data = {
    ...process.env,
    ...servableConfig.envs
  }

  const wasArray = Array.isArray(healthcheck.test)
  const testItems = wasArray ? healthcheck.test : [healthcheck.test]

  const renderedTest = await Promise.all(testItems.map(async (item) => {
    if (typeof item !== 'string') {
      return item
    }
    try {
      return await ejs.render(item, data, {
        async: true,
        strict: false
      })
    } catch (e) {
      return item
    }
  }))

  return {
    ...healthcheck,
    test: wasArray ? renderedTest : renderedTest[0]
  }
}
