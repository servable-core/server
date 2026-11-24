import fs from 'fs'
import path from 'path'
import { jest } from '@jest/globals'
import { buildSchema } from '@servable/tools'
import protocolsSubclass from '../../src/launch/registerClasses/registerProtocol/protocolsSubclass.js'
import adaptProtocolPayload from '../../src/launch/utils/adaptProtocolPayload.js'

// What a hard delete destroys with an object, and what it cascades to (owner's Q1540 a and Q1541 a, 2026-11-24).
// disposableorphansable destroys, after an object's delete, every row its `disposableOrphans()` names, and
// disposablechildrenable cascades to every row its `disposableChildren()` names. Each protocol and the app's class add
// their own names and call `super` for the rest, so both are methods. A class FIELD (`disposableOrphans = () => …`) is set
// on the instance: it hides the method of every protocol whose class sits above it, and its `super` reaches only the
// classes below it. In backend/main that hid the publishable protocol's rows from every hard delete since 2026-08-01.
//
// Proven on the classes as launch composes them: the schema built by @servable/tools from this package's own protocols
// and a small app (tests/fixtures/disposableListsApp), each class wrapped by protocolsSubclass, so a protocol's class
// extends the app's. Its `aboveable` protocol adds one name to each list, as the publishable protocol does in an app.

const fixtureFolder = path.resolve(process.cwd(), 'tests/fixtures/disposableListsApp')
const bundledProtocolsFolder = path.resolve(process.cwd(), 'src/protocols')
const ABOVEABLE_ORPHAN = 'aboveableOrphan'
const ABOVEABLE_CHILD = 'aboveableChild'

// Each class of servableconfigurable with the names it adds itself.
const SERVABLE_CONFIG_LISTS = {
  ServableConfig: { orphans: ['conditions', 'groups', 'entries'], children: ['conditions', 'groups', 'entries'] },
  ServableConfigEntry: { orphans: [], children: [] },
  ServableConfigCondition: { orphans: [], children: [] },
  ServableConfigConditionType: { orphans: [], children: [] },
  ServableConfigEntryInCondition: { orphans: [], children: [] },
  ServableConfigGroup: { orphans: [], children: [] },
}

class FakeServableObject {
  constructor(className) {
    this.className = className
  }
}

let allProtocols
const originalServable = globalThis.Servable

beforeAll(async () => {
  // The schema build logs what it resolves and the app protocols servableconfigurable names but this fixture lacks.
  ;['log', 'info', 'debug', 'warn', 'error'].forEach((level) => jest.spyOn(console, level).mockImplementation(() => {}))
  // What launch sets for class files to import (`class X extends Servable.App.Object`).
  globalThis.Servable = { App: { Object: FakeServableObject, User: class extends FakeServableObject {}, Role: class extends FakeServableObject {} } }
  const servableConfig = {
    protocols: { local: [bundledProtocolsFolder, path.join(fixtureFolder, 'protocols')] },
    rootProtocolPayload: { id: 'app', type: 'app', path: path.join(fixtureFolder, 'app') },
    envs: {},
  }
  ;({ protocols: allProtocols } = await buildSchema({ servableConfig }))
}, 60000)

afterAll(() => {
  globalThis.Servable = originalServable
  jest.restoreAllMocks()
})

const protocolNamed = (protocolId) => allProtocols.find(({ id }) => id === protocolId)

/** An instance of `className`, managed by `protocolId`, as launch composes it, with `extraProtocolIds` attached too. */
const composedInstanceOf = async ({ protocolId, className, extraProtocolIds = [] }) => {
  const { loader } = protocolNamed(protocolId)
  const ownClass = await loader.getClass({ className })
  const classProtocols = [...((await loader.classProtocols({ className })) || []), ...extraProtocolIds].map(adaptProtocolPayload)
  const ComposedClass = await protocolsSubclass({ protocols: classProtocols, _class: ownClass, allProtocols })
  return new ComposedClass(className)
}

const sorted = (names) => [...names].sort()

describe('servableconfigurable: each class declares its lists as methods', () => {
  test.each(Object.keys(SERVABLE_CONFIG_LISTS))('a %s answers from its prototype chain, never an instance field', async (className) => {
    const instance = await composedInstanceOf({ protocolId: 'servableconfigurable', className })
    expect(Object.prototype.hasOwnProperty.call(instance, 'disposableOrphans')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(instance, 'disposableChildren')).toBe(false)
    expect(sorted(instance.disposableOrphans())).toEqual(sorted(SERVABLE_CONFIG_LISTS[className].orphans))
    expect(sorted(instance.disposableChildren())).toEqual(sorted(SERVABLE_CONFIG_LISTS[className].children))
  })

  test.each(Object.keys(SERVABLE_CONFIG_LISTS))('a %s keeps the names of a protocol an app attaches above it', async (className) => {
    const instance = await composedInstanceOf({ protocolId: 'servableconfigurable', className, extraProtocolIds: ['aboveable'] })
    expect(sorted(instance.disposableOrphans())).toEqual(sorted([...SERVABLE_CONFIG_LISTS[className].orphans, ABOVEABLE_ORPHAN]))
    expect(sorted(instance.disposableChildren())).toEqual(sorted([...SERVABLE_CONFIG_LISTS[className].children, ABOVEABLE_CHILD]))
  })
})

describe('servableautoseedable: a seeded class keeps its seeder', () => {
  // A seeder is the source that seeds many templates: shared, never destroyed with one of them, nor cascaded to.
  test('its lists hold the names of the app and of the protocols above it, never `seeder`', async () => {
    const instance = await composedInstanceOf({ protocolId: 'app', className: 'Template' })
    expect(sorted(instance.disposableOrphans())).toEqual(sorted(['templateOrphan', ABOVEABLE_ORPHAN]))
    expect(sorted(instance.disposableChildren())).toEqual(sorted(['templateChild', ABOVEABLE_CHILD]))
  })
})

// The composed classes are proven above; this guard refuses the field form as it is written, in every file of src/.
// A class field (`disposableOrphans = …`, `static` or not) or an assignment on the instance (`this.disposableOrphans = …`).
const fieldDeclaration = /^\s*(?:static\s+)?disposable(?:Orphans|Children)\s*=(?!=)|\bthis\.disposable(?:Orphans|Children)\s*=(?!=)/m

const sourceFilesIn = (folder) => fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = path.join(folder, entry.name)
  if (entry.isDirectory()) {
    return entry.name === 'node_modules' ? [] : sourceFilesIn(entryPath)
  }
  return /\.(js|mjs|cjs)$/.test(entry.name) ? [entryPath] : []
})

describe('disposableOrphans and disposableChildren are never fields', () => {
  test('no file under src/ declares either as a field', () => {
    const sourceFolder = path.resolve(process.cwd(), 'src')
    const offenders = sourceFilesIn(sourceFolder)
      .filter((file) => fieldDeclaration.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(sourceFolder, file))
    expect(offenders).toEqual([])
  })

  test('the guard sees the field form and lets the method form through', () => {
    expect(fieldDeclaration.test('  disposableOrphans = () => {')).toBe(true)
    expect(fieldDeclaration.test('  disposableChildren = function () {')).toBe(true)
    expect(fieldDeclaration.test('  static disposableOrphans = () => []')).toBe(true)
    expect(fieldDeclaration.test('    this.disposableChildren = () => []')).toBe(true)
    expect(fieldDeclaration.test('  disposableOrphans() {')).toBe(false)
    expect(fieldDeclaration.test('    const items = super.disposableOrphans ? super.disposableOrphans() : []')).toBe(false)
    expect(fieldDeclaration.test('  // if (request.object.disposableOrphans) {')).toBe(false)
    expect(fieldDeclaration.test('  if (object.disposableOrphans === undefined) {')).toBe(false)
  })
})
