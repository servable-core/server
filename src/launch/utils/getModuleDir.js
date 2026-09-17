import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

/**
 * Resolves the on-disk root folder of an installed npm package (not the specific entry file
 * `require.resolve` would return), by walking Node's own module lookup paths for
 * `moduleEntry` and returning the first one that exists.
 *
 * @param {string} moduleEntry - a bare package specifier, e.g. `'@servable/tools'` or
 *   `'@servable/tools/package.json'`; only the package name portion is used.
 * @returns {string | undefined} the package's root directory, or `undefined` if it can't be
 *   found in any lookup path.
 */
export default (moduleEntry) => {
    const packageName = moduleEntry.includes('/')
        ? moduleEntry.startsWith('@')
            ? moduleEntry.split('/').slice(0, 2).join('/')
            : moduleEntry.split('/')[0]
        : moduleEntry;
    const require = createRequire(import.meta.url);
    const lookupPaths = require.resolve.paths(moduleEntry).map((p) => path.join(p, packageName));
    return lookupPaths.find((p) => fs.existsSync(p));
};