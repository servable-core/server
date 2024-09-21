import ejs from 'ejs'


export default async (props) => {
  const {
    variableValue,
    servableConfig,
    computedPortsEnvs
  } = props
  if (!variableValue) {
    return variableValue
  }
  const data = {
    ...computedPortsEnvs
  }

  try {
    const result = await ejs.render(
      variableValue,
      data,
      {
        async: true,
        strict: false,
        delimiter: ':'
      })
    return result
  } catch (e) {
    console.error(e)
    return variableValue
  }
}
