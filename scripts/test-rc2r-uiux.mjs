import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const read = file => readFileSync(file, 'utf8')
const layout = read('app/layout.tsx')
const css = read('app/harmony-rc2r-design-system.css')
const provider = read('components/theme/ThemeProvider.tsx')
const toggle = read('components/theme/ThemeToggle.tsx')
const rc2q = read('scripts/test-rc2q-frontends.mjs')
const packageJson = JSON.parse(read('package.json'))

assert.equal(layout.split("import './harmony-rc2r-design-system.css'").length - 1, 1,
  'The RC2R stylesheet must be imported once, after the existing RC2Q theme')
assert(layout.indexOf("import './harmony-rc2q-employee-attendance.css'") <
  layout.indexOf("import './harmony-rc2r-design-system.css'"))
assert.match(css, /@media screen\s*\{/)
assert(!css.includes('@import') && !css.includes('https://') && !css.includes('url(http'),
  'No remote style or tracking resource is permitted')
for (const token of [
  '--hrui-ink','--hrui-muted','--hrui-surface','--hrui-border','--hrui-shadow',
  '--hrui-input','--hrui-focus','--hrui-nav','--hrui-modal',
]) {
  assert(css.split(token).length >= 3, 'Missing dual-theme token '+token)
}
for (const selector of [
  '.harmony-sidebar-panel','.harmony-nav-item','.harmony-topbar',
  '.harmony-module-subnav','.harmony-rc2o-panel','.harmony-metric-card',
  '.harmony-rc2q-workflow','.harmony-rc2q-attendance-panel',
  '.harmony-remed-claim-card','.harmony-employee-directory-card',
  '.harmony-modal-surface','.harmony-theme-popover',
]) assert(css.includes(selector), 'RC2R UI coverage lost: '+selector)

for (const feature of [
  "harmony-color-theme",'prefers-color-scheme: dark','localStorage.setItem',
  "window.addEventListener('storage'",'data','document.documentElement.dataset.harmonyTheme',
  'useSyncExternalStore','storageUnavailableSelection',"return 'light'","applyTheme('light', 'light')",
]) assert(provider.includes(feature), 'Theme persistence or System Mode missing: '+feature)
for (const feature of [
  'Pilih mode tampilan','Ikuti tema sistem','aria-label="Aktifkan mode gelap"',
  'aria-label="Aktifkan mode terang"','aria-pressed',
  "event.key !== 'Escape'", "document.addEventListener('pointerdown'",
]) assert(toggle.includes(feature), 'Theme selector regression: '+feature)

assert(css.includes('prefers-reduced-motion'), 'Reduced-motion fallback missing')
assert(css.includes('prefers-reduced-transparency'), 'Reduced-transparency fallback missing')
assert(css.includes('@supports not (backdrop-filter: blur(1px))'), 'CSS blur fallback missing')
assert(css.includes("aria-controls='harmony-notification-panel'"), 'Compact notification CSS missing')

assert(rc2q.includes('latestApprovedAttendanceSnapshot'),
  'RC2Q guard must remain available')
assert(read('app/employee/attendance/page.tsx').includes('handleSubmitPeriod'),
  'Attendance submission must remain unchanged')
assert(read('app/employee/dashboard/page.tsx').includes('EmployeeWorkflowProgress'),
  'Real SCALE UP / Re-Med progress must remain available')
assert(read('components/ui/HarmonyModalPortal.tsx').includes('aria-modal="true"'),
  'Modal focus and accessibility must remain in place')

for (const forbidden of ['liquid-glass-react','next-themes','framer-motion','gsap','three']) {
  assert(!Object.hasOwn(packageJson.dependencies || {}, forbidden), 'Unreviewed production dependency installed: '+forbidden)
}
assert.equal(packageJson.scripts['test:rc2r:uiux'], 'node scripts/test-rc2r-uiux.mjs')

function countRoutes(folder, suffix) {
  const visit = dir => readdirSync(dir, { withFileTypes: true })
    .reduce((total, item) => total + (item.isDirectory()
      ? visit(join(dir, item.name))
      : item.name === suffix ? 1 : 0), 0)
  return visit(folder)
}
assert(countRoutes('app', 'page.tsx') >= 66, 'Employee/HR/Finance page route count regressed')
assert(countRoutes('app/api', 'route.ts') >= 60, 'Existing API routes were removed')
console.log('RC2R/RC3A UIUX guards PASS: enforced light provider, legacy tokens, fallbacks, route integrity, no new dependencies')
