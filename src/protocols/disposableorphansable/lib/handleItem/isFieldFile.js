export default (item) => {
    if (!item) {
        return false
    }
    return (item._name && item._url)
}
