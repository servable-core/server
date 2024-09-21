import ejs from 'ejs'

export default async (props) => {
  const {
    variableValue,
    servableConfig
  } = props
  if (!variableValue) {
    return variableValue
  }
  const data = {
    ...process.env,
    ...servableConfig.envs
  }

  try {
    return ejs.render(variableValue, data, {
      async: true,
      strict: false
    })
  } catch (e) {
    return variableValue
  }
}
