
export default async ({ files, prefix }) => {
  try {
    if (!files) {
      return
    }

    await Promise.all(files.map(async file => registerFile({ file, prefix })))
  }
  catch (e) {
    console.error(e)
  }
}


const registerFile = async ({ file, prefix }) => {
  try {
    const keys = Object.keys(file)
    if (!keys || !keys.length) {
      return
    }

    return Promise.all(keys.map(async key => registerItem({ key, item: file[key], prefix })))
  }
  catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') {
      console.error(e)
    }
  }
}

const registerItem = async ({ key, item, prefix }) => {
  const name = prefix ? `${prefix}${capitalizeFirstLetter(key)}` : key
  Servable.App.Jobs.define({
    ...item
  })

  // Servable.App.Cloud.job(name, item)
}

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
