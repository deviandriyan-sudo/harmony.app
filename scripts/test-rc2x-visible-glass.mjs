import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(file,'utf8')
const visual = read('app/harmony-rc2r-design-system.css')
const rc2q = read('app/harmony-rc2q-employee-attendance.css')
const attendance = read('app/employee/attendance/page.tsx')
const light = read('components/theme/HarmonyMaterialLight.tsx')
const sidebar = read('components/layout/AppSidebar.tsx')
const topbar = read('components/layout/Topbar.tsx')
const pkg = JSON.parse(read('package.json'))
const layout = read('app/layout.tsx')

function needs(src,terms,where) {
  for(const term of terms) assert(src.includes(term),where+' missing '+term)
}
needs(visual,[
  '--harmony-glass-ambient:', '--harmony-glass-chrome-bg:',
  '--harmony-glass-panel-bg:', '--harmony-glass-metric-bg:',
  '--harmony-glass-panel-filter:', '--harmony-glass-inset-bg:',
  '--harmony-glass-spot:', '--harmony-glass-content-bg:',
  '.harmony-workspace .harmony-rc2q-attendance-panel',
  '.harmony-rc2q-attendance .harmony-rc2q-approved-metric',
  '.harmony-rc2q-attendance .harmony-rc2q-today-summary',
  '.harmony-rc2q-attendance .harmony-attendance-history-toolbar',
  '.harmony-sidebar-nav .harmony-nav-item.harmony-nav-active .harmony-side-detail',
  '.harmony-topbar-search:focus-within',".harmony-liquid-surface:active",
  'prefers-reduced-transparency: reduce', 'prefers-contrast: more',
  '@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px)))',
],'Shared optical stylesheet')
assert.equal((visual.match(/--harmony-glass-panel-bg:/g)||[]).length,2,
  'Both light and dark themes must define optical panels')
assert.equal((visual.match(/--harmony-glass-metric-bg:/g)||[]).length,2,
  'Both light and dark themes must define optical metric cards')
assert.equal((visual.match(/\.harmony-workspace \.harmony-rc2q-attendance-panel,/g)||[]).length,2,
  'Opaque accessibility fallbacks must cover the actual attendance panel')
assert(!visual.includes('.harmony-workspace :is(.harmony-rc2q-workflow,.harmony-rc2q-attendance-panel)'),
  'Old flat shadow rule must not override attendance glass')
needs(rc2q,[
  'var(--harmony-glass-panel-bg,var(--rc2o-panel))',
  'var(--harmony-glass-metric-bg,var(--rc2o-panel))',
  'var(--harmony-glass-inset-bg,var(--rc2o-row-hover))',
], 'Legacy RC2Q panels wired to glass')
assert.equal((attendance.match(/harmony-rc2q-attendance-panel harmony-liquid-lit harmony-liquid-surface/g)||[]).length,2,
  'Both main attendance sections need live pointer highlights')
needs(attendance,['handleSubmitPeriod','toggleSelectAllAttendance',
  'registerHarmonySubmissionAttachments','isFutureUnrecordedCalendarDay'],
  'Attendance unchanged workflows')
needs(light,["closest<HTMLElement>('.harmony-liquid-lit')",
  "addEventListener('pointermove'","removeEventListener('pointermove'"],
  'Delegated MaterialLight')
needs(sidebar,['aria-current={active ? \'page\' : undefined}','harmony-liquid-lit'],
  'Sidebar')
needs(topbar,['harmony-topbar-search harmony-liquid-lit','harmony-topbar-action harmony-liquid-lit'],
  'Topbar')
needs(layout,["import './harmony-rc2r-design-system.css'",'<HarmonyMaterialLight />'],
  'CSS entrypoint and JS bridge')
assert(!layout.includes('harmony-rc2x.css'),'No new global CSS layer')
assert.equal(pkg.scripts['test:rc2x:glass'],'node scripts/test-rc2x-visible-glass.mjs')
assert.equal(pkg.dependencies.next,'16.4.6','Keep framework baseline')
assert(!visual.includes('@import') && !visual.includes('url(http'),'No remote CSS injection')

let depth=0
for(const character of visual.replace(/\/\*[\s\S]*?\*\//g,'')){
  if(character==='{') depth++
  else if(character==='}') depth--
  assert(depth>=0,'CSS closed early')
}
assert.equal(depth,0,'CSS braces balanced')
console.log('RC2X visible Liquid Glass PASS: actual attendance panel hooks, dual-theme optical depth, search/nav contrast, accessible fallbacks, unchanged workflows')
