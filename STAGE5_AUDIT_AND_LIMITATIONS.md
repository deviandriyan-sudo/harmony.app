# HARMONY Stage 5 — Contrast, Account Provisioning, Annual Leave

## Source of truth
Based on the **Stage 4 ZERO-AUDIT full-replacement ZIP**. Version remains `3.8.5`; this is a **Stage 5 review candidate** (not a verified live deployment).

## Verified source defects
1. `app/hr/employees/page.tsx` previously INSERTed `employees` only; login requires Supabase Auth + `app_users`. The SDM onboarding form now offers **Buat akun login HARMONY sekaligus** with an HR-supplied temporary password (>=8 chars). It creates employee first, then calls the existing role-guarded `/api/hr/users` endpoint, with a separate success/failure message. It never silently deletes the master row on account creation error. **Employees registered before this update still require HR → Kelola User to create their login.**
2. `/api/hr/users` previously silently reset the password/metadata of any existing Supabase Auth user found by email during create. It now refuses to overwrite an existing unlinked identity and returns an explicit 409. This prevents accidental account takeover/finance account conflicts; admin reconciliation must be deliberate.
3. `RemedClaimList` nested light utility tiles had pale text caused by dark theme semantic tokens on a white/translucent inner background. Added scoped semantic surface hooks and `contrast-hardening.css`; the bridge also covers common fixed light utility backgrounds across HR/Employee/Finance/Re-Med without changing print docs.
4. HR Employee Master list now remains accessible when the separate leave lifecycle-summary endpoint fails; it falls back to the stored balance without fabricating a corrected lifecycle amount.
5. Annual leave correction calls `harmony_hr_correct_annual_leave_balance_v1` which is **database-defined**. Source cannot confirm whether the production RPC exists, is granted to the authenticated HR, or whether `harmony_leave_balance_summary` includes legacy adjustment. Error messages now distinguish missing SQL, denied HR permission, and lifecycle verification mismatch. The RPC's transaction guard remains untouched.

## Important incomplete proof
- The **root cause of manual annual leave balance failure is not conclusively verified** without SQL diagnostic results from the **same production Supabase database** and the exact failed response. The source patch improves diagnostics; it does NOT claim to resolve a database formula mismatch. Avoid forcing employee annual_leave_balance updates because they may double count postponed balances or bypass the audit trail.
- No environment values, live Supabase access, authenticated browser session, Vercel, emails, or databases were available to execute real end-to-end tests here. Light/dark browser screenshots of each role should be checked after a preview deployment.
- `npm ci`, Next full build, semantic TypeScript and ESLint require the installed dependencies on the user's Windows/Vercel environment. Source AST and regression scripts can be checked in this sandbox.

## SQL diagnostics (read-only; optional)
`SQL_ONLY/05_STAGE5_LEAVE_DIAGNOSTIC_READ_ONLY.sql`: confirm permission RPC, correction RPC, audit table and view definition. **Execute only as read-only diagnostics**; if RPC is missing, inspect preflight before applying any existing migration.
`SQL_ONLY/06_STAGE5_EMPLOYEE_LOGIN_DIAGNOSTIC_READ_ONLY.sql`: aggregate employees missing app_users/Auth mappings. No names/emails returned.

## Preserved
- Existing 64 pages / 48 API routes / 112 total routes.
- Employee attendance uploads, 11–10 attendance periods, PHL, annual leave lifecycle, Re-Med, HR/Finance permissions, Supabase schema/data, notification queue, .env.local and .git.
- npm dependency baselines Next.js 16.4.3, SheetJS 0.20.3 and Stage 4 audit lockfile.
- CSS print templates remain white; semantic badges preserve status colors.

## Workflow for existing unlinked employee
HR → Kelola User → Buat User → select existing employee → email + initial password → Create; if an auth identity already exists, do **not** reset via generic create; request admin reconciliation. Verify employee login using its own account.
