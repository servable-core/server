import mongoose from "mongoose"

export default async ({ databaseURI }) => {
    try {
        const client = await mongoose.connect(databaseURI)
        return client
    } catch (e) {
        console.error(e)
    }

    return null
}