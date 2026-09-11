import path from 'path'

// Same collision surface as projectName/container_name (see handleProtocol/index.js's own
// comment) but on the *host data directory* itself: two docker-compose projects launched from
// the same process.cwd() (this resolves relative to that, not per-worktree) with the same
// protocol.id land on the identical `.system/app/docker` path and therefore the identical bind
// mount source - confirmed empirically, two containers both locking the same mongod.lock file
// under the same .system/app/docker/data/engine-database-mongo. Bind mounts resolving to
// different directories per real worktree checkout doesn't help here, since it's process.cwd()
// at runtime that decides this path, not which worktree the source lives in.
export default ({ protocol, servableConfig }) => {
  const namespace = servableConfig?.system?.docker?.namespace
  return path.resolve('', `.system/${namespace ? `${namespace}/` : ''}${protocol.id}/docker`)
}
