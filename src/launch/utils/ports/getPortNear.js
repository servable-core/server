import getPortWithinRange from "./getPortWithinRange.js";

export default async ({ port, maxRange = 100, exclude, host }) => {
    return getPortWithinRange({ start: port, end: port + maxRange, exclude, host })
}
