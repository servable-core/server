import fs from 'fs'
import path from 'path'

const perform = (filePath) => {
    const dirname = path.dirname(filePath)
    if (fs.existsSync(dirname)) {
        return true
    }
    perform(dirname)
    fs.mkdirSync(dirname)
}

export default perform