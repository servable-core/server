import ejs from 'ejs'

export default async (props) => {
  const {
    value,
    servableConfig
  } = props
  if (!value) {
    return value
  }

  const data = {
    ...process.env,
    ...servableConfig.envs
  }

  try {
    return ejs.render(value, data, {
      async: true,
      strict: false
    })
  } catch (e) {
    return value
  }
}
