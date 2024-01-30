export default async ({ item, }) => {
    const {
        name,
        type,
        description,
        options
    } = item

    return {
        name,
        type,
        description,
        options
    }
}
