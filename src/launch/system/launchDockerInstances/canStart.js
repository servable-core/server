


export default async () => {
  const _systemStatus = await systemStatus()
  if (!_systemStatus.shouldStart) {
    return false
  }

  return true
}

const systemStatus = async () => {
  let shouldStart = true
  let message = ''
  const dockerUtils = (await import('mydockerjs/lib/docker-utils.js')).default
  await new Promise((resolve, reject) => {
    dockerUtils.isDockerEngineRunning((err, isRunning) => {
      if (!isRunning) {
        message = "System > Docker is not running."
        Servable.Console.error(message)
        shouldStart = false
      }
      resolve()
    })
  })
  await new Promise((resolve, reject) => {
    dockerUtils.isDockerComposeInstalled((err, isInstalled) => {
      if (!isInstalled) {
        message = "System > Docker is not installed."
        Servable.Console.error(message)
        shouldStart = false
      }
      resolve()
    })
  })

  return { shouldStart, message }
}
