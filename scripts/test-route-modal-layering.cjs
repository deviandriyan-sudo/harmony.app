/* RC2F: inventory all route/component JSX full-screen overlays and prohibit
 * overlays inside page stacking contexts. No Supabase or browser required. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const files = []
for (const rootDir of ['app', 'components']) {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.tsx')) files.push(full)
    }
  }
  walk(path.join(root, rootDir))
}
const sourceOf = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const mount = sourceOf('components/ui/HarmonyPortaledOverlay.tsx')
assert(mount.includes('createPortal(') && mount.includes('document.body'), 'Shared adapter must mount on body')
assert(mount.includes('useSyncExternalStore'), 'Portal must avoid server/client hydration mismatch')
assert(mount.includes('<div {...props}>'), 'Portal must preserve existing classNames and event handlers')
const portal = sourceOf('components/ui/HarmonyModalPortal.tsx')
assert(portal.includes('createPortal(') && portal.includes('document.body'), 'Existing modal portal must still target document.body')
const employee = sourceOf('app/hr/employees/page.tsx')
assert(employee.includes('function EmployeeModalPortal(') && employee.includes('createPortal(children, document.body)'), 'HR Employee modals must retain existing portal')
const css = sourceOf('app/globals.css')
assert(css.includes('body > .harmony-modal-surface[role="dialog"]'), 'Portaled dialog layering CSS missing')
assert(css.includes('body > .harmony-mobile-drawer-layer'), 'Mobile navigation layering missing')

const exceptions = new Set([
  'app/hr/employees/page.tsx', // rendered inside EmployeeModalPortal
  'components/ui/HarmonyModalPortal.tsx', // rendered as direct createPortal child
])
const hits = []
const violations = []
let pages = 0, apis = 0
for (const f of files) {
  const rel = path.relative(root, f).replaceAll('\\', '/')
  if (rel.startsWith('app/') && rel.endsWith('/page.tsx')) pages++
  const raw = fs.readFileSync(f, 'utf8')
  const sf = ts.createSourceFile(rel, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(sf.parseDiagnostics.length, 0, `Invalid TSX ${rel}: ${sf.parseDiagnostics.map(d => d.messageText).join(' / ')}`)
  const check = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node
      const className = opening.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.text === 'className')
      const classValue = className?.initializer?.getText(sf) || ''
      const coversView = classValue.includes('harmony-modal-surface') || classValue.includes('harmony-mobile-drawer-layer') || (classValue.includes('fixed') && classValue.includes('inset-0'))
      if (coversView) {
        const element = opening.tagName.getText(sf)
        const line = sf.getLineAndCharacterOfPosition(opening.getStart(sf)).line + 1
        hits.push({ file: rel, line, element })
        if (element !== 'HarmonyPortaledOverlay' && !exceptions.has(rel)) {
          violations.push(`${rel}:${line}: full-screen ${element} is not body-portaled`)
        }
        if (element === 'HarmonyPortaledOverlay') {
          assert(raw.includes("import { HarmonyPortaledOverlay } from '@/components/ui/HarmonyPortaledOverlay'"), `Missing modal import ${rel}`)
          assert(opening.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.text === 'role'), `Missing overlay semantics ${rel}:${line}`)
        }
      }
    }
    ts.forEachChild(node, check)
  }
  check(sf)
}
for (const f of ['app/employee/layout.tsx','app/hr/layout.tsx','app/remed/layout.tsx']) {
  assert(sourceOf(f).includes('<HarmonyPortaledOverlay role="navigation"'), `${f}: mobile drawer must escape page stacking`)
}
assert.equal(violations.length, 0, violations.join('\n'))
assert(hits.length >= 16, `Expected inventory of 16 modal/drawer roots, found ${hits.length}`)
const upload = sourceOf('app/hr/attendance/upload/page.tsx')
assert(upload.includes('<HarmonyPortaledOverlay') && upload.includes('Unggah dan proses absensi'), 'Screenshot route must use body portal')
const apiDir = path.join(root, 'app/api')
function countApi(dir) { let count = 0; for (const ent of fs.readdirSync(dir, {withFileTypes:true})) { const full=path.join(dir,ent.name); if(ent.isDirectory())count+=countApi(full); else if(ent.name==='route.ts')count++ }return count }
apis=countApi(apiDir)
assert.equal(pages, 68, 'Reviewed page inventory must remain unchanged')
assert.equal(apis, 68, 'Reviewed API inventory must remain unchanged')
const expectedInventory=JSON.parse(sourceOf('scripts/rc3n-route-inventory.json'))
const routeInventory=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const full=path.join(dir,e.name);return e.isDirectory()?routeInventory(full):['page.tsx','route.ts'].includes(e.name)?[path.relative(root,full).replaceAll('\\','/')]:[]})
assert.deepEqual(routeInventory(path.join(root,'app')).sort(),expectedInventory)
for (const expected of ['app/api/hr/dashboard/monitoring/route.ts','app/api/employee/dashboard/approval-summary/route.ts','app/api/remed/finance/summary/route.ts']) assert(fs.existsSync(path.join(root, expected)), `Missing RC2O read-only endpoint: ${expected}`)
console.log(`PASS: RC2F modal route audit: ${pages} pages + ${apis} APIs; ${hits.length} fullscreen overlay roots checked; 0 unportaled routes (HR employee and shared portal already body-portaled).`)
