import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const root = process.cwd()
const read = p => fs.readFileSync(path.join(root,p), 'utf8')
const pageFiles = []
function walk(dir) {
 for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
  const p=path.join(dir,ent.name)
  if (ent.isDirectory()) walk(p)
  else if (/page\.tsx?$/.test(ent.name)) pageFiles.push(p)
 }
}
walk(path.join(root,'app'))
const routes = new Set(pageFiles.map(p => '/'+path.relative(path.join(root,'app'),path.dirname(p)).replaceAll(path.sep,'/')).map(p=>p==='/'?p:p.replace(/\/$/,'')))
const required = [
 '/hr/dashboard','/hr/employees','/hr/attendance','/hr/leave','/hr/phl',
 '/employee/dashboard','/employee/attendance','/employee/leave','/employee/phl',
 '/employee/account','/employee/account/documents',
 '/hr/employees/profile/[employeeId]','/hr/employees/profile/[employeeId]/documents',
 '/remed/hr/dashboard','/remed/finance/dashboard','/remed/employee/dashboard',
 '/remed/finance/claims','/remed/finance/payments','/remed/finance/history',
]
for (const route of required) assert(routes.has(route),`Page missing: ${route}`)
const nav = read('lib/navigation.ts')
const tab = read('components/layout/ModuleSubnav.tsx')
const ui = read('components/dashboard/WorkspaceActions.tsx')
const css = read('app/globals.css')
assert(nav.includes("href: '/employee/account/documents'"),'Documents navigation missing')
assert(tab.includes('keepAttendancePeriod') && tab.includes('isValidAttendancePeriod'),'Attendance period propagation lost')
assert(tab.includes('aria-current={active ?'),'Navigation active accessibility missing')
assert(tab.includes('harmony-subnav-more') && tab.includes('overflow'),'Progressive disclosure missing')
assert(ui.includes('href={href}') && ui.includes('focus-visible'),'Quick links/accessibility missing')
assert(css.includes('HARMONY UX V3.7.8') && css.includes('prefers-reduced-motion'),'Compact UI CSS missing')
for(const action of ['/hr/attendance/upload','/employee/leave','/employee/phl','/employee/account','/remed/finance/payments']) {
 assert([read('app/hr/dashboard/page.tsx'),read('app/employee/dashboard/page.tsx'),read('components/remed/RemedAdminDashboard.tsx')].join('\n').includes(action),`Dashboard action missing ${action}`)
}
console.log(`HARMONY UI integrity PASS: ${routes.size} pages; preserved role actions, periods, document entry points`)
