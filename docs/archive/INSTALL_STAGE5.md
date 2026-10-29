# HARMONY V3.8.5 Stage 5 — Full Replacement (REVIEW)

Scope: dark/light color contrast repairs, newly registered employee account provisioning, HR annual leave correction diagnostics and three Next.js navigation lint warnings.

**READ BEFORE DEPLOY:** The annual-leave database-root bug remains **unverified** until SQL read-only diagnostics from the production database are reviewed. This ZIP does **not** modify or reset any existing Supabase data. Do not run SQL_ONLY/02 again without reviewing preflight results. This release is a REVIEW candidate until full Windows build/lint and functional tests pass.

## Install (Windows)

1. Backup `D:\WEBSITE\harmony.app` outside project.
2. Extract this ZIP to `D:\WEBSITE\HARMONY_STAGE5_UPDATE`.
3. Copy only the **contents** of `COPY_TO_HARMONY_APP` into `D:\WEBSITE\harmony.app`. Select **Replace** when prompted.
4. Preserve existing `.env.local`, `.git`, database and GitHub branch; the ZIP intentionally contains none of them. Do not paste the outer ZIP folder inside `harmony.app`.
5. Run:

```powershell
cd D:\WEBSITE\harmony.app
npm ci
npx tsc --noEmit
npm run lint
node scripts/test-stage5-guards.mjs
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

6. If all build/tests pass, test in local browser: new employee account creation and actual login, HR annual leave correction, dark/light HR, Employee and Re-Med claims, Finance payment, and leave print preview. Never perform real mutations to production records just to test.
7. If all checks passed and staging list contains no private files:

```powershell
git fetch origin
git status -sb
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "fix: HARMONY Stage 5 contrast and employee onboarding"
git push origin HEAD:main
```

8. Confirm Vercel production deployment is Ready and run role-based smoke checks. No SQL migration is required by this source package itself.

## Existing employee cannot login
HR → **Kelola User** → Create user for the existing employee with correct email and a fresh password. An employee master row is **not** a login account. If that email already exists in Supabase Auth but no app_users mapping exists, the API refuses to overwrite the pre-existing identity: administrator reconciliation is required.

## Annual leave correction still failing?
Run **only read-only** SQL `SQL_ONLY/05_STAGE5_LEAVE_DIAGNOSTIC_READ_ONLY.sql` in Supabase production, then share the returned metadata/view definition plus the UI error (hide identity data). `SQL_ONLY/06_STAGE5_EMPLOYEE_LOGIN_DIAGNOSTIC_READ_ONLY.sql` identifies orphan users with aggregate counts only.

## Report
`STAGE5_AUDIT_AND_LIMITATIONS.md`, `STAGE5_CHANGED_FILES.csv`, `STAGE5_SHA256_MANIFEST.txt` provide the file-level review and limitations.
