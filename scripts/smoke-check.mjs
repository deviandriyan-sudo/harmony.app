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


function routeShape(route) {
  return route
    .replace(/\[\[\.\.\.[^\]]+\]\]/g, '[...*]')
    .replace(/\[\.\.\.[^\]]+\]/g, '[...*]')
    .replace(/\[[^\]]+\]/g, '[*]')
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
  'app/api/employee/phl-claims/route.ts',
  'app/api/hr/users/change-email/route.ts',
  'app/api/system/status/route.ts',
  'components/system/SystemMaintenanceGate.tsx',
  'lib/server/system-control.ts',
  'lib/phl-work.ts',
  'lib/server/phl-work.ts',
  'lib/server/job-queue.ts',
  'app/api/notifications/queue/route.ts',
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

for (const [label, map] of [['page', pageRoutes], ['API', apiRoutes]]) {
  const shapes = new Map()
  for (const [route, file] of map) {
    const shape = routeShape(route)
    if (shapes.has(shape) && shapes.get(shape) !== route) {
      failures.push(`Dynamic ${label} route collision: ${shapes.get(shape)} <-> ${route}`)
    } else {
      shapes.set(shape, route)
    }
  }
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
assert(sourceText.includes('canonicalizeLeaveBalanceSummary'), 'Canonical leave balance resolver belum terpasang.')
assert(sourceText.includes('balance_integrity_status'), 'Leave balance integrity marker belum terpasang.')

assert(!sourceText.includes('harmony_sync_phl_balance_from_attendance_v2'), 'Legacy sync saldo PHL dari approval attendance masih direferensikan.')
assert(sourceText.includes('buildUploadHistoryDisplay'), 'Dedup riwayat upload per periode belum terpasang.')
assert(sourceText.includes('normalizeUploadFileNameDisplay'), 'Normalisasi nama berkas upload belum terpasang.')
assert(!sourceText.includes("'harmony_reconcile_attendance_period_v1'"), 'Recovery attendance legacy masih dapat memanggil Auto-PHL.')

const employeeSourceText = walk(path.join(root, 'app', 'employee'))
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')
assert(!employeeSourceText.includes('sendHarmonyEmail('), 'Employee/supervisor masih dapat memanggil email custom; wajib memakai workflow template server.')

const employeeLeaveSource = fs.readFileSync(path.join(root, 'app/employee/leave/page.tsx'), 'utf8')
assert(employeeLeaveSource.includes('/api/employee/phl-claims'), 'Klaim PHL employee belum memakai API server-side.')
assert(!employeeLeaveSource.includes('harmony_employee_submit_phl_claim_v1'), 'Klaim PHL employee masih memanggil submit RPC langsung dari client.')
assert(sourceText.includes('/api/hr/users/change-email'), 'Sinkronisasi perubahan email akun belum terpasang.')
assert(employeeLeaveSource.includes('countCalendarDays(form.start_date, form.end_date)'), 'Klaim PHL masih memakai hitungan hari kerja/weekend exclusion.')
const emailRouteSource = fs.readFileSync(path.join(root, 'app/api/hr/users/change-email/route.ts'), 'utf8')
assert(emailRouteSource.includes('legacy_uuid_mismatch'), 'Email login legacy UUID reconciliation belum terpasang.')
assert(emailRouteSource.includes('authByAppEmail'), 'Rekonsiliasi email belum memprioritaskan mapping app_users lama.')
assert(emailRouteSource.includes('orphanAuthForTarget'), 'Rekonsiliasi email belum menangani Supabase Auth orphan/duplicate yang aman.')
assert(emailRouteSource.includes('orphan_email_duplicate_for_target_employee'), 'Audit reason untuk orphan Auth duplicate belum terpasang.')
const phlClaimApiSource = fs.readFileSync(path.join(root, 'app/api/employee/phl-claims/route.ts'), 'utf8')
assert(phlClaimApiSource.includes('PHL_ACTIVE_CLAIM_EXISTS'), 'Preflight duplicate Klaim PHL belum terpasang.')
assert(phlClaimApiSource.includes('PHL_LEGACY_UNIQUE_INDEX'), 'Handling legacy unique index Klaim PHL belum terpasang.')
const phlWorkApiSource = fs.readFileSync(path.join(root, 'app/api/phl/work-requests/route.ts'), 'utf8')
assert(phlWorkApiSource.includes('canonicalDate'), 'Normalisasi tanggal Pengajuan Saldo PHL belum terpasang.')
assert(phlWorkApiSource.includes('hasConfiguredSupervisor'), 'Validasi atasan Pengajuan Saldo PHL belum terpasang.')
assert(phlWorkApiSource.includes('employee_number') && phlWorkApiSource.includes('historicalDateVariants'), 'Lookup histori PHL lintas periode belum memakai NPK/date fallback.')
assert(phlWorkApiSource.includes('Math.max(directMinutes, effectiveMinutes)'), 'Durasi PHL belum mempertimbangkan koreksi/manual attendance.')
assert(phlWorkApiSource.includes('sync_on_approval'), 'Fallback sinkron absensi saat approval PHL belum terpasang.')
assert(!phlWorkApiSource.includes('data absensi periode lama harus sudah tersedia'), 'PHL retroaktif masih diblokir ketika histori punch lama tidak tersedia.')
const phlReviewApiSource = fs.readFileSync(path.join(root, 'app/api/phl/work-requests/[id]/review/route.ts'), 'utf8')
assert(phlReviewApiSource.includes('syncApprovedPHLToAttendance'), 'Approval PHL belum menyinkronkan absensi otomatis.')
assert(phlReviewApiSource.includes("source: 'employee_live_manual'"), 'Sinkron absensi PHL belum memakai source manual attendance yang kompatibel.')
const dashboardSource = fs.readFileSync(path.join(root, 'app/employee/dashboard/page.tsx'), 'utf8')
assert(dashboardSource.includes('Ajukan Saldo PHL') && dashboardSource.includes('/employee/phl'), 'Dashboard belum menyediakan jalur Pengajuan Saldo PHL terpisah.')
assert(sourceText.includes('harmony-modal-surface'), 'Modal feedback surface belum terpasang.')


const systemControlSource = fs.readFileSync(path.join(root, 'lib/server/system-control.ts'), 'utf8')
assert(systemControlSource.includes('harmony_system_controls'), 'System maintenance control belum terpasang.')
assert(sourceText.includes('EMAIL_DISABLED_MAINTENANCE'), 'Email gate maintenance belum terpasang.')
const uploadSource = fs.readFileSync(path.join(root, 'app/hr/attendance/upload/page.tsx'), 'utf8')
assert(uploadSource.includes('deriveUploadPeriod'), 'Auto-detection periode upload absensi belum terpasang.')
assert(uploadSource.includes('skippedExistingCount'), 'Incremental attendance merge belum terpasang.')
assert(uploadSource.includes('Periode akan dibaca otomatis setelah file dipilih'), 'Field periode upload belum otomatis/read-only.')

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const versionSource = fs.readFileSync(path.join(root, 'lib/version.ts'), 'utf8')
assert(versionSource.includes(`HARMONY_APP_VERSION = '${pkg.version}'`), `package.json dan lib/version.ts tidak sinkron: ${pkg.version}`)
assert(fs.existsSync(path.join(root, 'app/api/notifications/attendance-upload/route.ts')), 'Dispatch absensi belum disediakan.')
assert(uploadSource.includes('processAttendanceUploadEmails'), 'Hook dispatch email upload belum tersedia.')
assert(sourceText.includes('harmony_claim_attendance_emails_v1'), 'Atomic email claim belum tersedia.')
assert(sourceText.includes('harmony_claim_jobs_v1'), 'Background notification queue claim belum tersedia.')
assert(sourceText.includes('scheduleHarmonyJobQueueDrain'), 'Background queue drain belum direferensikan.')
assert(sourceText.includes('processHarmonyJobQueue'), 'Cron fallback background queue belum direferensikan.')
assert(sourceText.includes('deliverHarmonyServerEmail'), 'Direct provider sender untuk queue worker belum tersedia.')
assert(sourceText.includes('Idempotency-Key'), 'Resend idempotency belum digunakan.')
assert(sourceText.includes('/api/hr/attendance/upload-file'), 'HR signed file route belum digunakan.')
assert(Boolean(pkg.scripts?.['test:smoke']), 'Script test:smoke belum tersedia.')
assert(!sourceText.includes('harmony_reconcile_leave_lifecycle'), 'RPC lifecycle obsolete/missing masih direferensikan oleh source.')

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
