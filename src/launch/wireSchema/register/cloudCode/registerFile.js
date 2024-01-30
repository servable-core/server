import registerItem from "./registerItem.js"

export default async ({ file, prefix }) => {
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

