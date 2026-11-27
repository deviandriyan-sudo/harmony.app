import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const dashboard = read('app/employee/dashboard/page.tsx')
const summary = read('app/api/employee/dashboard/approval-summary/route.ts')
const decision = read('app/api/employee/dashboard/approval-decision/route.ts')
const hr = read('app/api/hr/phl/legacy-review/route.ts')
const hrUI = read('app/hr/phl/page.tsx')
const workReview = read('app/api/phl/work-requests/[id]/review/route.ts')
const sqlPath = process.argv.find((arg) => arg.startsWith('--sql='))?.slice(6)
const sql = sqlPath ? fs.readFileSync(path.resolve(sqlPath), 'utf8') : null
const types = read('lib/dashboard-approval-types.ts')

// 1. Decisions happen IN the dashboard, not via misleading navigation labels.
assert.match(dashboard, /openApproval\(item,'approve'\)/)
assert.match(dashboard, /openApproval\(item,'reject'\)/)
assert.match(dashboard, /role="dialog" aria-modal="true"/)
assert.match(dashboard, /submitApproval\(\)/)
assert.match(dashboard, /approvalReviewed/)
assert.match(dashboard, /reviewPHLWorkRequest\(item\.recordId,decision,note\)/)
assert.match(dashboard, /\/api\/employee\/dashboard\/approval-decision/)
assert.match(dashboard, /sendHarmonyWorkflowNotification/)
assert.match(summary, /phlWorkApprovalExpired\(row\.work_date\)/)
assert.match(summary, /requiresHr = expired && row\.origin === 'legacy_attendance'/)
assert.match(summary, /canApprove: !expired/)
assert.match(summary, /canReject: !requiresHr/)
assert.match(types, /kind: 'attendance' \| 'leave' \| 'work' \| 'claim'/)
assert.match(summary, /require a detailed attendance review/)

// 2. JWT + verified employee relationship remain mandatory for server-side approval.
assert.match(decision, /requireHarmonyApi\(request\)/)
assert.match(decision, /getPHLSubordinateIds\(auth\.admin, auth\.employee\)/)
assert.match(decision, /row\.employee_id === auth\.employee\.id/)
assert.match(decision, /deriveApprovalStage\(row\) !== 'waiting_supervisor'/)
assert.match(decision, /Authorization: bearer/)
assert.match(decision, /approve_leave_request_by_supervisor/)
assert.match(decision, /reject_leave_request_by_supervisor/)
assert.match(decision, /harmony_supervisor_review_phl_claim_v1/)
assert.doesNotMatch(decision, /auth\.admin\.rpc\('approve_leave_request_by_supervisor'/)

// 3. 90-day expiry guard in the existing PHL supervisor API must NOT be bypassed.
assert.match(workReview, /phlWorkApprovalExpired\(clean\(target\.work_date\)\)/)
assert.match(workReview, /PHL_EXPIRED/)
assert.match(workReview, /isPHLSupervisorOf/)

// 4. Historical HR resolution is a separate explicit audit-only process.
assert.match(hr, /HR_ROLES\.has\(normalizeHarmonyRole\(auth\.appUser\.role\)\)/)
assert.match(hr, /row\.origin !== 'legacy_attendance'/)
assert.match(hr, /phlWorkApprovalExpired\(row\.work_date\)/)
assert.match(hr, /harmony_hr_resolve_expired_legacy_phl_rc3g/)
assert.match(hrUI, /Catatan pemeriksaan HR \(wajib\)/)
assert.match(hrUI, /Validasi riwayat penugasan \(tanpa kredit saldo\)/)
if (sql) {
  assert.match(sql, /SECURITY INVOKER/)
  assert.match(sql, /current_user <> 'service_role'/)
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.harmony_hr_resolve_expired_legacy_phl_rc3g/)
  assert.match(sql, /UNIQUE \(request_id\)/)
  assert.match(sql, /FOR UPDATE/)
  assert.match(sql, /v_request\.status <> 'pending_supervisor' OR v_request\.origin <> 'legacy_attendance'/)
  assert.match(sql, /v_request\.work_date \+ 90 >= current_date/)
  assert.match(sql, /balance_credited boolean NOT NULL DEFAULT false CHECK \(balance_credited = false\)/)
  assert.match(sql, /'resolved_legacy'/)
  assert.doesNotMatch(sql, /INSERT INTO public\.phl_records/i)
  assert.doesNotMatch(sql, /UPDATE public\.employees/i)

}

console.log('RC3G PASS — direct dashboard approval guards, supervisor authorization, PHL expiry guard and HR-only historical endpoint.' + (sql ? ' SQL invariants PASS.' : ' SQL guard: run with --sql=<SQL-file> for migration assertions.'))
