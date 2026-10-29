# HARMONY Stage 6 | Review package audit

Supabase evidence: `annual_leave_employee_adjustments` has 8 columns and 48 rows at diagnostic date, and `PRIMARY KEY (employee_id)`; no non-internal trigger on employees/adjustment table. Installed RPC writes only employees legacy annual_leave_balance; view actually reads adjustment_days.

Stage 6 fixes **the existing RPC implementation**, keeps HR permission, input validation, employee row lock, adjustment transaction verification and correction-audit insert. It now writes ONLY the matching employee row in annual_leave_employee_adjustments and does not touch legacy balance, cycle or postpone rows. Before and after audits record the legacy value unchanged. An upsert is used for employees missing an adjustment row.

Stage 6 includes scoped CSS contrast for employee modal in light/dark mode, a more actionable API error for old installed RPC, and deprecation comment on SQL 02 to prevent regression.

Local verified: 64 pages + 48 APIs, 16 script checks PASS, PTKP 9 cases PASS, TypeScript parse for 219 files 0 syntax diagnostics, CSS parse 0 errors. Exact Next build and production SQL execution NOT available in sandbox. Windows and Supabase verification are mandatory before production deployment. Future independent lifecycle reconciliation could still update adjustment source; its implementation was not supplied.

Stage 4 package.json and lockfile are byte-for-byte unchanged (last user npm audit = 0). No env secrets, node_modules, build cache, or git history included.

## Changed/new files (8):
- NEW `INSTALL_STAGE6.md`
- MODIFIED `SQL_ONLY/02_V380_SAFE_AUDITED_ANNUAL_CORRECTION.sql`
- NEW `SQL_ONLY/07_STAGE6_LIFECYCLE_ANNUAL_CORRECTION_SAFE.sql`
- NEW `SQL_ONLY/08_STAGE6_VERIFY_CORRECTION_READ_ONLY.sql`
- MODIFIED `app/api/hr/leave/balance-correction/route.ts`
- NEW `app/employee-master-contrast.css`
- MODIFIED `app/layout.tsx`
- NEW `scripts/test-stage6-guards.mjs`
