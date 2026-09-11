// Suffixes an explicit `container_name:` with servableConfig.system.docker.namespace, when set -
// see handleProtocol/index.js's own comment on projectName for the full reasoning. A service
// with no container_name (the normal case - most services rely on Docker Compose's own
// project-based auto-naming, which projectName already makes unique per namespace) is untouched.
// No namespace set: this function returns containerName completely unchanged.
export default ({ containerName, servableConfig }) => {
  const namespace = servableConfig.system?.docker?.namespace
  if (!containerName || !namespace) {
    return containerName
  }

  return `${containerName}-${namespace}`
}
