import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const css = read('app/harmony-rc2r-design-system.css')
const legacy = read('app/globals.css')
const leave = read('app/employee/leave/page.tsx')
const approvals = read('app/employee/approvals/leave/page.tsx')
const attendanceApprovals = read('app/employee/approvals/attendance/page.tsx')
const employeeAttendance = read('app/employee/attendance/page.tsx')
const phlApprovals = read('app/employee/approvals/phl/page.tsx')
const settings = read('app/employee/settings/page.tsx')
const profile = read('components/profile/ProfileWorkspace.tsx')
const claim = read('app/remed/employee/claims/new/page.tsx')
const remedHeader = read('components/remed/RemedPageHeader.tsx')
const scaleup = read('components/scaleup/ScaleupWorkspace.tsx')
const pkg = JSON.parse(read('package.json'))

function contains(source, required, label) {
  assert(source.includes(required), 'RC2T missing '+label+': '+required)
}
for (const [name,file,terms] of [
  ['Native popup styles',css,[
    'html[data-harmony-theme] select:not([multiple])',
    'color-scheme: light !important',
    'option,optgroup',
    'color: #1a2d45 !important',
    'background-color: #ffffff !important',
  ]],
  ['Leave modal',leave,[
    'HarmonyModalPortal labelledBy={titleId}',
    'harmony-leave-modal-panel',
    'harmony-leave-modal-header',
    'harmony-leave-modal-close',
    'harmony-leave-modal-identity',
    'harmony-leave-modal-tile',
    'onSubmit={onSubmit}',
  ]],
  ['Leave approval',approvals,[
    'harmony-approval-leave-page','harmony-approval-leave-heading',
    'harmony-approval-leave-toolbar',
  ]],
  ['Attendance approval',attendanceApprovals,[
    'harmony-supervisor-attendance','harmony-approval-flow-note',
  ]],
  ['Employee attendance',employeeAttendance,[
    'harmony-attendance-status-pill','harmony-attendance-approval-pill',
    'harmony-attendance-request-pill','harmony-attendance-action-fill',
    'isFutureUnrecordedCalendarDay(row, draft)',
    'row.date > getTodayISO()',
    'status === "future_pending"',
    'Belum berlangsung',
    'handleSubmitPeriod',
    'toggleSelectAllAttendance',
  ]],
  ['PHL approval',phlApprovals,[
    'harmony-supervisor-phl','harmony-phl-day-type',
    'harmony-phl-info','harmony-phl-approve',
    'phlWorkApprovalExpired(item.work_date)',
  ]],
  ['Re-Med',claim,['harmony-remed-claim-form-page','harmony-remed-claim-form',
    'harmony-remed-bank-panel','name="claim_type_id"']],
  ['Re-Med header',remedHeader,['harmony-remed-page-header']],
  ['Profile',profile,[
    'harmony-profile-doc-group','harmony-profile-doc-badge',
    'harmony-profile-upload-bar','uploadDocument(chosen',
  ]],
  ['Settings',settings,['harmony-account-settings-ui','harmony-settings-input-shell',
    'harmony-settings-instruction']],
  ['SCALE UP',scaleup,['scaleup-root','scaleup-field','scaleup-input']],
]) {
  for (const needle of terms) contains(file, needle, name)
}
for (const component of [
  '.harmony-leave-modal-panel',
  '.harmony-approval-leave-page',
  '.harmony-supervisor-attendance',
  '.harmony-supervisor-phl',
  '.harmony-remed-claim-form-page',
  '.harmony-remed-page-header',
  '.harmony-profile-doc-group',
  '.harmony-settings-input-shell',
  '.harmony-approval-flow-note',
  '.harmony-attendance-status-pill',
  '.harmony-attendance-action-fill',
]) contains(css,component,'CSS coverage')

contains(legacy,'background: var(--hrui-modal, #f7fbff) !important',
  'legacy leave modal replaced with theme token')
contains(legacy,'color: var(--hrui-ink, #193659)',
  'legacy leave label replaced with theme token')
assert(!css.includes('@import') && !css.includes('url(http'),
  'No remote styles/scripts may be injected')
assert(!read('package.json').includes('"next-themes"') && !read('package.json').includes('"liquid-glass-react"'),
  'No external theme or shader runtime should be installed')

function luminance(hex) {
  const rgb=[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16)/255)
    .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]
}
const [a,b]=[luminance('#1a2d45'),luminance('#ffffff')].sort((x,y)=>y-x)
assert((a+.05)/(b+.05)>=7,
  'Native option popup foreground/background must meet WCAG AAA normal-text contrast')
assert.equal(pkg.scripts['test:rc2t:uiux'],'node scripts/test-rc2t-form-readability.mjs')
console.log('RC2T form readability source guards PASS: Windows select popup, portal modal, supervisor, profile, Re-Med and PHL')
