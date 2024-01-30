export default async (props) => {
  const { operation, direction, taskProps } = props
  switch (direction) {
    case 'up':
    case 'down': {
      break
    } default: {
      return
    }
  }

  const { up, down, } = operation
  const task = (direction === 'up') ? up : down
  if (!task) {
    return
  }
  await task.default(taskProps)
}