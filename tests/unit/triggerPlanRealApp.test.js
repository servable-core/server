import fs from 'fs'
import path from 'path'
import { jest } from '@jest/globals'
import { buildSchema } from '@servable/tools'
import { compareLegacyAndPlannedTriggers, KINDS } from '../fixtures/triggerEquivalence.js'

// The trigger plan against a real app: backend/main's protocols, classes and trigger files (read only, never run: the
// harness wraps every trigger file's functions at the loader). For every managed class and every kind of trigger, the
// planned registration must run the same handlers as the legacy one, in the same order, with the same arguments, and
// register a Parse trigger only where one of them runs.
//
// SERVABLE_TRIGGER_PLAN_APP points at the app (default: the workspace's backend/main beside lib/servable). The test is
// skipped when there is none, so the package's suite still runs alone.
const appRoot = process.env.SERVABLE_TRIGGER_PLAN_APP || path.resolve(process.cwd(), '../../../backend/main')
const bundledProtocols = path.resolve(process.cwd(), 'src/protocols')
const hasTheApp = fs.existsSync(path.join(appRoot, 'servable.schema.json')) && fs.existsSync(path.join(appRoot, 'app'))
const describeIfApp = hasTheApp ? describe : describe.skip
if (!hasTheApp) {
  process.stdout.write(`[trigger plan, real app] skipped: no app at ${appRoot} (needs servable.schema.json and app/; set SERVABLE_TRIGGER_PLAN_APP to point at one)\n`)
}

class ServableBaseObject {}

describeIfApp(`the trigger plan on a real app (${appRoot})`, () => {
  test('every class and kind of trigger runs what it ran before, and only kinds that run something are registered', async () => {
    const quiet = ['log', 'info', 'debug', 'warn', 'error'].map((level) => jest.spyOn(console, level).mockImplementation(() => {}))
    // What the CLI sets for class files to import (`class X extends Servable.App.Object`).
    globalThis.Servable = { App: { Object: ServableBaseObject, User: class extends ServableBaseObject {}, Role: class extends ServableBaseObject {} } }
    const servableConfig = {
      protocols: { local: [bundledProtocols, path.join(appRoot, 'protocols')] },
      rootProtocolPayload: { id: 'app', type: 'app', path: path.join(appRoot, 'app') },
      envs: {},
    }
    const { protocols } = await buildSchema({ servableConfig })
    const committedClasses = JSON.parse(fs.readFileSync(path.join(appRoot, 'servable.schema.json'), 'utf8')).classes
    const { rows, differences } = await compareLegacyAndPlannedTriggers({ allProtocols: protocols, quietRoundMilliseconds: 15 })
    const warnings = console.warn.mock.calls.map((parts) => parts.join(' ')).filter((line) => line.includes('dependency cycle'))
    quiet.forEach((spy) => spy.mockRestore())
    delete globalThis.Servable

    // Every class of the app's committed schema was compared (minus _Session, which Servable never touches).
    const comparedClassNames = new Set(rows.map(({ className }) => className))
    const expectedClassNames = committedClasses.map(({ className }) => className).filter((className) => className !== '_Session')
    expect(expectedClassNames.filter((className) => !comparedClassNames.has(className))).toEqual([])
    expect(rows.length).toBe(comparedClassNames.size * KINDS.length)

    expect(differences).toEqual([])
    expect(warnings).toEqual([])
    for (const row of rows) {
      const isAfterSaveRegistered = rows.find((other) => other.className === row.className && other.kind === 'afterSave').isPlannedRegistered
      const isNeeded = row.legacyHandlerNames.length > 0 || (row.kind === 'beforeSave' && isAfterSaveRegistered)
      expect({ className: row.className, kind: row.kind, isRegistered: row.isPlannedRegistered }).toEqual({ className: row.className, kind: row.kind, isRegistered: isNeeded })
    }

    const registered = rows.filter((row) => row.isPlannedRegistered)
    const classesWithoutTrigger = [...comparedClassNames].filter((className) => !registered.some((row) => row.className === className))
    const handlerCount = rows.reduce((count, row) => count + row.plannedHandlerNames.length, 0)
    process.stdout.write(`[trigger plan, real app] ${comparedClassNames.size} classes, ${rows.length} class x kind pairs compared, ${handlerCount} handler calls identical; registered ${registered.length} of ${rows.length} (legacy ${rows.filter((row) => row.isLegacyRegistered).length}); ${classesWithoutTrigger.length} classes without any trigger\n`)
    process.stdout.write(`[trigger plan, real app] registered per kind: ${KINDS.map((kind) => `${kind} ${registered.filter((row) => row.kind === kind).length}`).join(', ')}\n`)
  }, 300000)
})
