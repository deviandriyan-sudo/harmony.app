import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = name => readFileSync(name, 'utf8')
const compact = read('app/harmony-compact-rc2o.css')
const base = read('app/harmony-rc2r-design-system.css')
const rc2q = read('app/harmony-rc2q-employee-attendance.css')
const layout = read('app/layout.tsx')
const metric = read('components/dashboard/CompactMetric.tsx')
const sidebar = read('components/layout/AppSidebar.tsx')
const topbar = read('components/layout/Topbar.tsx')
const employee = read('app/employee/dashboard/page.tsx')
const hr = read('app/hr/dashboard/page.tsx')
const leave = read('app/employee/leave/page.tsx')
const supervisor = read('app/employee/approvals/page.tsx')
const attendance = read('app/employee/attendance/page.tsx')
const phl = read('app/employee/approvals/phl/page.tsx')
const pkg = JSON.parse(read('package.json'))

function needs(source, keys, name) {
  for (const key of keys) {
    assert(source.includes(key), name + ' lost ' + key)
  }
}
function light(hex) {
  const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
    .map(v => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4)
  return 0.2126*r + 0.7152*g + 0.0722*b
}
function contrast(a,b) {
  const [x,y] = [light(a),light(b)].sort((v,w)=>w-v)
  return (x+.05)/(y+.05)
}
for (const key of ["html[data-harmony-theme='light']","html[data-harmony-theme='dark']"]) {
  const start = base.indexOf(key)
  assert(start !== -1, 'Theme missing: '+key)
  const body = base.slice(base.indexOf('{',start)+1,base.indexOf('}',start))
  const get = k => {
    const match = body.match(new RegExp('--'+k+':\\s*(#[0-9a-fA-F]{6})'))
    assert(match,'Missing token '+k+' in '+key)
    return match[1]
  }
  assert(contrast(get('hrui-ink'),get('hrui-surface-strong')) >= 7,
    key+' must retain AAA primary text contrast')
}
needs(compact, ['background:var(--rc2o-panel)','--rc2o-bg:#f5f7f9',
  '--rc2o-bg:#141a21','height:40px;min-height:40px','font-weight:600'], 'Compact chrome')
assert(!compact.includes('background:linear-gradient(112deg,#154880'),
  'Generic hero must be neutral, not a hue-gradient')
needs(base, ['background: #2468a8 !important','background: #184971 !important',
  '.harmony-glass-scene { display: none !important; }',
  '.harmony-glass-showcase .harmony-glass-showcase-metric::before',
  '.harmony-workspace .harmony-metric-card[data-tone]'], 'Shared Unslop design system')
needs(rc2q, ["url('/harmony-campus.jpg')",'.harmony-rc2q-employee-hero h1',
  'min-height:148px','border-inline-start:3px solid'], 'Real employee visual')
assert(!rc2q.includes('harmony-rc2q-approved-metric.blue {background:linear-gradient'),
  'Summary metrics must not use decorative gradients')
needs(metric, ['harmony-metric-card','tabular-nums','harmony-text-primary'], 'Metrics')
assert(!metric.includes('harmony-glass-metric-icon'),
  'Decorative icon blocks must be removed from metric source')
needs(sidebar, ['aria-current={active ? \'page\' : undefined}','harmony-sidebar-nav','h-10 items-center'],
  'Sidebar navigation')
needs(topbar, ['harmony-topbar-search','rounded-xl border px-3 transition-colors',
  'handleToggleNotification'], 'Topbar controls')
needs(employee, ['EmployeeWorkflowProgress','TodayTeamAvailability',
  'supervisorApprovals','Ringkasan kepegawaian'], 'Employee dashboard')
needs(hr, ['Monitoring Tidak Hadir','Perlu Tindakan HR',
  'Monitoring kepegawaian'], 'HR dashboard')
needs(leave, ['onClick={openForm}','harmony-leave-modal-panel'], 'Employee leave')
needs(supervisor, ['buildSubordinateRelationMap'], 'Supervisor')
assert(supervisor.includes('harmony-supervisor-hero') || supervisor.includes('harmony-approval-overview') || supervisor.includes('harmony-approval-toolbar'),
  'Supervisor must retain a clear approval context surface')
needs(attendance, ['handleSubmitPeriod','toggleSelectAllAttendance',
  'registerHarmonySubmissionAttachments','isFutureUnrecordedCalendarDay'], 'Attendance')
needs(phl, ['phlWorkApprovalExpired(item.work_date)'], 'PHL approval expiry')
needs(layout, ["import './harmony-compact-rc2o.css'",
  "import './harmony-rc2q-employee-attendance.css'",
  "import './harmony-rc2r-design-system.css'"], 'Existing styling entrypoints')
assert(!layout.includes('harmony-rc2u-unslop.css'),
  'Do not add another global CSS stylesheet')
assert(!base.includes('@import') && !base.includes('url(http'),
  'No remote CSS imports')
assert(pkg.scripts['test:rc2u:unslop'] === 'node scripts/test-rc2u-unslop.mjs',
  'Missing registered RC2U guard')
assert(pkg.dependencies.next === '16.4.6',
  'Dependency version must not drift')
console.log('RC2U Unslop structural safeguards PASS: neutral light/dark palette, photo retained, data-first metrics, workflow guards and no new dependencies')
