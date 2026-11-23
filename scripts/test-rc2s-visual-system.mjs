import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(file, 'utf8')
const css = read('app/harmony-rc2r-design-system.css')
const team = read('components/employee/TodayTeamAvailability.tsx')
const profile = read('components/profile/ProfileWorkspace.tsx')
const attendance = read('app/employee/attendance/page.tsx')
const approvals = read('app/employee/approvals/page.tsx')
const leave = read('app/employee/leave/page.tsx')
const remed = read('app/remed/employee/dashboard/page.tsx')
const packageJson = JSON.parse(read('package.json'))

const required = [
  ['team semantic surface',team,'harmony-team-person'],
  ['team category columns',team,'harmony-team-column'],
  ['team handover surface',team,'harmony-team-handover'],
  ['profile scoped surface',profile,'harmony-profile-workspace'],
  ['profile field',profile,'harmony-profile-field'],
  ['attendance compact toolbar',attendance,'harmony-attendance-history-toolbar'],
  ['attendance review toolbar',attendance,'harmony-attendance-review-toolbar'],
  ['supervisor compact module',approvals,'harmony-approval-module'],
  ['supervisor metrics',approvals,'harmony-approval-hero-metric'],
  ['leave details',leave,'harmony-leave-balance-panel'],
  ['remed scoped surface',remed,'harmony-remed-employee-ui'],
  ['login-independent css scope',css,'@media screen'],
  ['dark palette',css,"html[data-harmony-theme='dark']"],
  ['light palette',css,"html[data-harmony-theme='light']"],
  ['motion fallback',css,'prefers-reduced-motion'],
  ['transparency fallback',css,'prefers-reduced-transparency'],
]
for(const [name,file,needle] of required) assert(file.includes(needle),name+' is missing: '+needle)
for(const selector of [
  '.harmony-team-person','.harmony-team-column','.harmony-profile-field',
  '.harmony-attendance-history-toolbar','.harmony-approval-module',
  '.harmony-leave-balance-panel','.harmony-remed-employee-ui','.scaleup-root',
]) assert(css.includes(selector), 'RC2S CSS class not styled: '+selector)
assert(!css.includes('@import')&&!css.includes('url(http')&&!css.includes('https://'),
  'Visual layer must not load remote scripts, CSS or tracking assets')

function palette(name) {
  const location=css.indexOf(name)
  assert(location>=0,name+' palette missing')
  const start=css.indexOf('{',location)
  const end=css.indexOf('}',start)
  const map=Object.fromEntries([...css.slice(start,end).matchAll(/(--hrui-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)]
    .map(([,key,value])=>[key,value]))
  assert(map['--hrui-ink']&&map['--hrui-surface-strong'],'incomplete palette '+name)
  return map
}
function luminance(hex) {
  const rgb=[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16)/255)
    .map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4)
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722
}
function contrast(fg,bg) {
  const [a,b]=[luminance(fg),luminance(bg)].sort((x,y)=>y-x)
  return (a+.05)/(b+.05)
}
for(const name of ["html[data-harmony-theme='light']","html[data-harmony-theme='dark']"]){
  const p=palette(name)
  assert(contrast(p['--hrui-ink'],p['--hrui-surface-strong'])>=7,
    name+' body text / primary surface must reach WCAG AAA normal-text contrast')
}
assert(profile.includes("uploadDocument(file,category)"),'Profile document upload changed')
assert(profile.includes("harmony:avatar-updated"),'Avatar update event changed')
assert(attendance.includes('handleSubmitPeriod'),'Attendance period submission lost')
assert(attendance.includes('toggleSelectAllAttendance'),'Attendance select-all lost')
assert(attendance.includes('registerHarmonySubmissionAttachments'),'Attendance evidence lost')
assert(approvals.includes('buildSubordinateRelationMap'),'Supervisor mapping must remain unchanged')
assert(leave.includes('onClick={openForm}'),'Leave request modal must remain usable')
assert(packageJson.scripts['test:rc2s:uiux']==='node scripts/test-rc2s-visual-system.mjs')
console.log('RC2S UI structural/contrast safeguards PASS: semantic surfaces, WCAG tokens, preserved workflows')
