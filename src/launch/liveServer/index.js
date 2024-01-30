
export default async ({ httpServer, frameworkBridge }) => {
  return frameworkBridge.launchLiveServer({ httpServer })
}
