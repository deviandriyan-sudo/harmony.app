import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const css = read('app/harmony-rc2r-design-system.css')
const compact = read('app/harmony-compact-rc2o.css')
const layout = read('app/layout.tsx')
const portal = read('components/ui/HarmonyModalPortal.tsx')
const attendance = read('app/employee/attendance/page.tsx')
const leave = read('app/employee/leave/page.tsx')
const phl = read('app/employee/approvals/phl/page.tsx')
const pkg = JSON.parse(read('package.json'))

function has(source, needles, name) {
  for (const needle of needles) {
    assert(source.includes(needle), name + ': missing ' + needle)
  }
}
has(css, [
  '--hrui-glass-edge', '--hrui-glass-rim', '--hrui-glass-surface',
  '--hrui-glass-control', '--hrui-glass-highlight',
  '--hrui-glass-shadow', '--hrui-glass-filter',
  '.harmony-sidebar-panel', '.harmony-topbar', '.harmony-module-subnav',
  '.harmony-theme-popover', '.harmony-mobile-topbar',
  '.harmony-workspace :is(', '.scaleup-root :is(.scaleup-panel,.scaleup-metric)',
  'body > .harmony-leave-request-modal .harmony-leave-modal-panel',
  'prefers-reduced-transparency: reduce', 'prefers-contrast: more',
  '@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px)))',
], 'Glass material')
assert(!css.includes('harmony-rc2v-liquid-glass.css'), 'Do not stack new CSS entrypoints')
has(layout, ["import './harmony-rc2r-design-system.css'"], 'Existing CSS entrypoint')
assert(!layout.includes("import './harmony-rc2v"), 'No additional CSS entrypoint')
has(portal, ['createPortal(', 'aria-modal="true"', 'handleKeyDown'], 'Modal portal')
has(attendance, ['handleSubmitPeriod', 'toggleSelectAllAttendance',
  'registerHarmonySubmissionAttachments', 'isFutureUnrecordedCalendarDay'],
  'Attendance workflow')
has(leave, ['harmony-leave-modal-panel', 'onClick={openForm}'], 'Leave request')
has(phl, ['phlWorkApprovalExpired(item.work_date)'], 'PHL expiry')
has(compact, ['harmony-rc2o-hero','harmony-metric-card'], 'Prior style source')
assert(css.includes('input:not([type=\'checkbox\']):not([type=\'radio\']):not([type=\'file\'])'),
  'Checkbox/radio/upload styles must not be flattened')
const mobile = css.lastIndexOf('@media (max-width: 767px)')
const reduced = css.lastIndexOf('@media (prefers-reduced-transparency: reduce), (prefers-contrast: more)')
assert(mobile >= 0 && reduced > mobile, 'Accessible fallback must override mobile blur')
assert(!css.includes('@import') && !css.includes('url(http'),
  'Do not add remote styles or network dependencies')
assert.equal(pkg.scripts['test:rc2v:glass'], 'node scripts/test-rc2v-liquid-glass.mjs')
assert.equal(pkg.dependencies.next, '16.4.6', 'Keep Next.js baseline')

function palette(selector) {
  const start = css.indexOf(selector)
  assert(start >= 0, 'Missing theme ' + selector)
  const block = css.slice(css.indexOf('{',start)+1, css.indexOf('}',start))
  const prop = name => {
    const match = block.match(new RegExp('--'+name+':\\s*(#[0-9a-fA-F]{6})'))
    assert(match, 'Missing opaque contrast token ' + name)
    return match[1]
  }
  for (const name of [
    'hrui-glass-edge','hrui-glass-surface','hrui-glass-control','hrui-glass-filter'
  ]) assert(block.includes('--'+name+':'), 'Missing glass token '+name)
  return {text:prop('hrui-ink'),opaque:prop('hrui-surface-strong')}
}
function luminance(hex) {
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
    .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]
}
function ratio(f,b) {
  const [a,z]=[luminance(f),luminance(b)].sort((x,y)=>y-x)
  return (a+.05)/(z+.05)
}
for(const theme of ["html[data-harmony-theme='light']","html[data-harmony-theme='dark']"]) {
  const {text,opaque}=palette(theme)
  assert(ratio(text,opaque)>=7, theme+' data layer must pass AAA body-text contrast')
}
console.log('RC2V Liquid Glass source safeguards PASS: shared materials, both themes, data legibility, fallbacks, retained workflows')
