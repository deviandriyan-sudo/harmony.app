# HARMONY RC2ZE — Attendance Composition and Balanced Controls

**Baseline:** HARMONY RC2ZD installed over RC2ZC/RC2ZB/RC2Z. ZIP patches this exact baseline; installer compares normalized SHA-256 hashes before changing any tracked file.

## Scope

- Summary Periode: metric tiles restructured to SCALE UP-style icon-first cards; six semantic palettes (`sky`, `mint`, `honey`, `rose`, `lavender`, `aqua`) and dark variants.
- Riwayat Absensi and Absensi Hari Ini: one common sheet, side by side when card container is at least 1100px wide; stacked on narrow devices.
- Fixed height and sizing for Export Excel, CSV, Refresh and Today's actions, as well as Centang Semua/Submit.
- Manual Check In/Out still open the existing **LiveManualAttendanceModal**; no inline form or new API.
- Simplified Verifikasi Riwayat Absensi copy retained. Attendance period date, authorization, lock checks, approval eligibility, file upload validation, and print rules unchanged.
- SCALE UP overview metric cards receive coordinated semantic color backgrounds, no content changes.
- RC2ZC static guard updated to assert the **current** unified DOM structure instead of the earlier markup string. Original workflow coverage remains.
- RC2ZE source-level regression guard added.

## Automated verification in the authoring environment

- TypeScript `node node_modules/typescript/bin/tsc --noEmit`: PASS.
- ESLint: PASS, 0 errors, 1 pre-existing warning in `scripts/test-rc2i-source-guards.mjs`.
- 25 targeted regression scripts: 25 PASS, including RC2Q–RC2ZE, modal, upload, PHL, SCALE UP, Re-Med print and auth guards.
- Next.js Linux production build: **BLOCKED**, Linux SWC package not locally available and network access unavailable; run it in Windows as below.
- Actual HARMONY browser visual QA: **NOT RUN**. A static browser rendering attempt timed out; do not interpret source tests as visual proof.

## Windows commands

```powershell
cd 'D:\WEBSITE\harmony.app'
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run test:rc2q:frontends
npm.cmd run test:rc2x:glass
npm.cmd run test:rc2z:glass
npm.cmd run test:rc2zc:attendance
npm.cmd run test:rc2ze:attendance
npm.cmd run test:remed-print
npm.cmd run test:upload-security
npm.cmd run test:scaleup
npm.cmd run build
```

Check exit codes; browser QA at 375/768/1440px and Light/Dark/System, collapsed and expanded sidebar. Check new layout when attendance sheet width is at least 1100px, all button heights and the manual attendance modal including file attachment. Use staging/test data for writing workflows.

## Regression & rollback

No SQL migration required. Do not merge to `main` until Windows build and browser interaction/visual QA pass. Backup folder and rollback script are included. Never run SQL or alter live financial/attendance records just to assess this visual patch.
