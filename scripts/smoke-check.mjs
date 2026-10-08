import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appDir = path.join(root, 'app')
const failures = []
const warnings = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

function normalizeRoute(file) {
  let rel = path.relative(appDir, path.dirname(file)).replaceAll(path.sep, '/')
  rel = rel
    .split('/')
    .filter((segment) => segment && !(segment.startsWith('(') && segment.endsWith(')')))
    .join('/')
  return '/' + rel
}

assert(fs.existsSync(appDir), 'Folder app/ tidak ditemukan.')
if (fs.existsSync(path.join(root, '.next'))) warnings.push('.next terdeteksi sebagai cache build lokal; file ini diabaikan oleh smoke check dan .gitignore.')
if (fs.existsSync(path.join(root, 'tsconfig.tsbuildinfo'))) warnings.push('tsconfig.tsbuildinfo terdeteksi sebagai cache TypeScript lokal; file ini diabaikan oleh smoke check dan .gitignore.')

const requiredFiles = [
  'app/login/page.tsx',
  'app/hr/layout.tsx',
  'app/employee/layout.tsx',
  'app/remed/layout.tsx',
  'app/api/auth/access/route.ts',
  'app/api/health/route.ts',
  'app/hr/settings/system-health/page.tsx',
  'lib/server/user-api-auth.ts',
  'lib/server/hr-api-auth.ts',
  'lib/server/remed-api-auth.ts',
  'lib/harmony-client.ts',
  'lib/version.ts',
  'lib/server/workflow-notifications.ts',
  'lib/server/core-workflow-notifications.ts',
  'types/notificationWorkflow.ts',
  'app/employee/phl/page.tsx',
  'app/employee/approvals/phl/page.tsx',
  'app/hr/phl/page.tsx',
  'app/api/phl/work-requests/route.ts',
  'app/api/phl/work-requests/[id]/review/route.ts',
  'lib/phl-work.ts',
  'lib/server/phl-work.ts',
]

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `File wajib hilang: ${file}`)
}

const allAppFiles = walk(appDir)
const routeFiles = allAppFiles.filter((file) => /\/(page|route)\.(tsx?|jsx?)$/.test(file.replaceAll('\\', '/')))
const pageRoutes = new Map()
const apiRoutes = new Map()

for (const file of routeFiles) {
  const route = normalizeRoute(file)
  const isApi = path.basename(file).startsWith('route.')
  const map = isApi ? apiRoutes : pageRoutes
  if (map.has(route)) failures.push(`Duplicate ${isApi ? 'API' : 'page'} route: ${route}`)
  else map.set(route, file)
}

const forbiddenPaths = [
  '/hr/workforce',
  '/hr/attendance/security',
]
for (const route of [...pageRoutes.keys(), ...apiRoutes.keys()]) {
  for (const forbidden of forbiddenPaths) {
    assert(!route.startsWith(forbidden), `Route outsource HOLD masih aktif: ${route}`)
  }
}

const sourceText = walk(root)
  .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file) && !file.includes(`${path.sep}.next${path.sep}`) && !file.includes(`${path.sep}scripts${path.sep}`))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')

assert(!sourceText.includes(['security','shift','detection'].join('-')), 'Legacy security-shift-detection masih ditemukan.')
assert(sourceText.includes("'/api/auth/access'"), 'Server access guard belum direferensikan.')
assert(sourceText.includes("'/api/health'"), 'System Health belum direferensikan.')
assert(!fs.existsSync(path.join(root, 'lib/absence-notifications.ts')), 'Helper dormant absence-notifications.ts masih ada.')
assert(sourceText.includes('notifyRemedClaimSubmitted'), 'Notifikasi submit Re-Med belum terpasang.')
assert(sourceText.includes('notifyRemedHrDecision'), 'Notifikasi keputusan HR Re-Med belum terpasang.')
assert(sourceText.includes('notifyRemedFinanceDecision'), 'Notifikasi keputusan Finance Re-Med belum terpasang.')
assert(sourceText.includes('notifyRemedPaymentCompleted'), 'Notifikasi pembayaran Re-Med belum terpasang.')
assert(sourceText.includes('notifyRemedEntitlementChanged'), 'Notifikasi perubahan plafond Re-Med belum terpasang.')
assert(sourceText.includes('notifyRemedClaimCancelled'), 'Notifikasi pembatalan Re-Med belum terpasang.')
assert(sourceText.includes('CUSTOM_EMAIL_FORBIDDEN'), 'Hardening endpoint email custom belum terpasang.')
assert(sourceText.includes('leave_request_cancelled'), 'Notifikasi pembatalan Cuti/Izin/PHL belum terpasang.')
assert(sourceText.includes('postpone_request_cancelled'), 'Notifikasi pembatalan Postpone belum terpasang.')
assert(sourceText.includes('harmony_review_phl_work_request_v1'), 'Independent PHL approval RPC belum direferensikan.')
assert(sourceText.includes('phl_work_request_id'), 'Link PHL independen ke attendance belum terpasang.')
assert(sourceText.includes('Pengajuan Saldo PHL'), 'Label Pengajuan Saldo PHL belum terpasang.')
assert(!sourceText.includes('PHL tanpa menunggu cutoff.'), 'Judul PHL lama masih ditemukan.')
assert(sourceText.includes('legacy_attendance'), 'Support migrasi PHL attendance legacy belum terpasang.')
assert(!sourceText.includes('harmony_sync_phl_balance_from_attendance_v2'), 'Legacy sync saldo PHL dari approval attendance masih direferensikan.')
assert(!sourceText.includes("'harmony_reconcile_attendance_period_v1'"), 'Recovery attendance legacy masih dapat memanggil Auto-PHL.')

const employeeSourceText = walk(path.join(root, 'app', 'employee'))
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')
assert(!employeeSourceText.includes('sendHarmonyEmail('), 'Employee/supervisor masih dapat memanggil email custom; wajib memakai workflow template server.')

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
assert(pkg.version === '3.3.4', `package.json version harus 3.3.4, saat ini ${pkg.version}`)
assert(Boolean(pkg.scripts?.['test:smoke']), 'Script test:smoke belum tersedia.')

if (warnings.length) {
  console.warn(`HARMONY smoke check WARNINGS (${warnings.length})`)
  for (const warning of warnings) console.warn(`- ${warning}`)
}

if (failures.length) {
  console.error(`HARMONY smoke check FAILED (${failures.length})`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('HARMONY smoke check PASSED')
console.log(`Pages: ${pageRoutes.size}`)
console.log(`API routes: ${apiRoutes.size}`)
console.log(`Total routes: ${pageRoutes.size + apiRoutes.size}`)
