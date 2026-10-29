# HARMONY Stage 6 — lifecycle annual leave correction + Employee Master modal contrast

**Status: REVIEW.** Package source passes static/local source regression checks, but cannot validate your production Supabase database or Next build remotely.

## 1. Backup first
- Preserve a copy of `D:\WEBSITE\harmony.app` outside the project directory.
- Take a Supabase project/database backup or an export of relevant tables (`employees`, `annual_leave_employee_adjustments`, `harmony_annual_leave_correction_audit`) and database function definitions. The SQL migration is transactional, but a backup is still required.
- Do not upload `.env.local` or service-role credentials.

## 2. SQL migration (required for leave fix; NO auto SQL)
1. In **the correct Supabase project** open SQL Editor and review `SQL_ONLY/07_STAGE6_LIFECYCLE_ANNUAL_CORRECTION_SAFE.sql`.
2. Run the entire file **once**. It uses BEGIN/COMMIT and checks schema compatibility before replacing the existing HR correction RPC.
3. The postflight should show `stage6_correction_rpc_installed=true`. Adjustment row count should remain unchanged at that moment (48 in the supplied diagnostic, unless business data changed meanwhile).
4. **Never rerun `SQL_ONLY/02_V380_SAFE_AUDITED_ANNUAL_CORRECTION.sql`** after this; that historic script replaces the fixed RPC with the broken legacy-only one.
5. Do not manually edit `employees.annual_leave_balance` or bulk-update any adjustment rows.

## 3. Full-replacement source (not a patch)
1. Extract this ZIP to `D:\WEBSITE\HARMONY_STAGE6_UPDATE`.
2. Copy **contents** of `COPY_TO_HARMONY_APP` into `D:\WEBSITE\harmony.app`, choose Replace.
3. Preserve `.env.local`, `.git` and old database. ZIP deliberately excludes `.env.local`, `.git`, `node_modules`, `.next`.
4. No dependency upgrade: Stage 4 `package.json` and `package-lock.json` are unchanged.

## 4. Windows validation
```powershell
cd D:\WEBSITE\harmony.app
npm ci
npx tsc --noEmit
npm run lint
node scripts/test-stage6-guards.mjs
npm run test:smoke
npm run test:ui
npm run test:balance
npm run test:ptkp
npm run test:theme-normalization
npm run test:avatar
npm run build
npm audit
npm audit --omit=dev
```
STOP if tsc/build/tests fail; share log. Existing 3 ESLint warnings from 16.4.3 may remain depending on deployed source; build should have 0 errors. Audit expected 0 based on Stage 4 lockfile, but must be checked again.

## 5. Functional verification BEFORE production deploy
- In a controlled HR account and with business approval, test correction on a designated test employee or approved record. Set an absolute target (not a delta). Verify view summary equals target, audit row appears, and 1 employee only changed. Do not manipulate real employee balances solely for testing.
- Run `SQL_ONLY/08_STAGE6_VERIFY_CORRECTION_READ_ONLY.sql` to check aggregate consistency.
- Revisit Employee Master modal in Dark/Light and check labels, input values, balance cards, error messages, header/close button, and responsive scroll.
- After any automated leave reconciliation runs, recheck whether the correction is retained. The external reconciliation SQL was not supplied and may require separate review if it overwrites manual adjustments.

## 6. Deploy to GitHub (only after checks)
```powershell
git fetch origin
git status -sb
git add -A
git diff --cached --check
git --no-pager diff --cached --stat
git commit -m "fix: HARMONY Stage 6 annual leave RPC and modal contrast"
git push origin HEAD:main
```
No `--force`. Confirm Vercel deployment from latest commit Ready and run role/login/leave/PHL/attendance/Re-Med/email smoke tests.

## Scope/limits
- Supabase diagnostic confirmed 8 adjustment columns, 48 existing rows and PK(employee_id). The view reads `adjustment_days`, but old RPC wrote only `employees.annual_leave_balance`. This SQL changes the RPC source to the canonical adjustment table; it intentionally does NOT alter legacy balance or reconciliation checkpoints.
- No mass data rewrite, no changes to leave cycles, postpone, PHL, reimbursement, authentication, role routing or notification workflow. Any future reconciliation that writes the same table should be analyzed independently.
