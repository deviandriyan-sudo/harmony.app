# INSTALL — HARMONY V3.8.5 GLOBAL DUAL THEME

Only source/CSS presentation and version/test changes; **no new SQL or npm dependency**. The archive includes original `SQL_ONLY` for testing; do not rerun executed migrations.

## Replace source (Windows PowerShell)

1. Backup the current project folder `D:\WEBSITE\harmony.app`.
2. Extract archive and open `COPY_TO_HARMONY_APP`.
3. Copy **all contents** into `D:\WEBSITE\harmony.app`, replacing same-named files; keep the original `.env.local` and `.git` completely untouched. Do not copy any `node_modules` or `.next`.
4. Keep existing production Vercel environment variable configuration unchanged.

```powershell
cd D:\WEBSITE\harmony.app
npm ci
npm run test:theme-normalization
npm run test:theme
npm run test:login-motion
npm run test:smoke
npm run test:ui
npm run test:modal
npm run test:hr-modal
npm run test:avatar
npm run test:motion
npm run test:ptkp
npm run test:balance
npx tsc --noEmit
npm run lint
npm run build
```

If any command fails, stop before deployment and share its exact output. `npm ci` must run with the checked-in lockfile. Clean `.next` if a stale local build causes confusing results; it is ignored by Git.

When checks pass:

```powershell
git status
git add .
git commit -m "fix: global dual-theme color normalization v3.8.5"
git push origin HEAD:main
```

Vercel deploy is triggered by GitHub integration if enabled. This session has **not** performed Git push or Vercel deployment.

## Post-deploy smoke review (both Dark and Light)

- Login, campus photo, upright logo, theme toggle, Google sign-in and reset.
- HR → Employees: employee card labels, balances, Detail/Edit/power buttons, modal.
- HR → Attendance: four workflow cards, secondary links, period selectors.
- HR → Attendance Upload: history table, private download controls, status, upload actions.
- HR → Attendance Review: table header, zero counts, not submitted / approved / conflicts, details.
- Employee → Dashboard, Attendance, Cuti/PHL, Account: labels and approvals.
- HR Re-Med and Finance → Claims/Payments: state badges, monetary values, permissions, print preview (white paper).
- Sidebar collapsed/expanded, modal portals, mobile 360/390 px, focus-visible controls.

## Rollback

Keep the pre-replacement full project backup. If a new theme issue impacts use, restore last-known-good V3.8.4 full source and original `.env.local`/`.git`, run `npm ci`, tests and `npm run build`, then commit/push rollback after approval. Database rollback is unnecessary because no migrations are included.
