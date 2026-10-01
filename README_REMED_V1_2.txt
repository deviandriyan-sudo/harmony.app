HARMONY + RE-MED V1.2.0 — SINGLE LOGIN / INTEGRATED MENU

COPY TARGET
D:\WEBSITE\harmony.app

CANONICAL CHANGE
- Re-Med is now a module/menu inside HARMONY.
- There is only ONE login: /login.
- The old Harmony/Re-Med swipe/carousel login is removed.
- Employee and HR see Re-Med from the HARMONY sidebar when their remed_user_access is active.
- Finance also uses /login, but Finance is NOT promoted to HARMONY HR/employee role.
- Finance only receives Re-Med Finance menus/routes.
- /remed/** and /api/remed/** remain isolated namespaces to prevent collision with HARMONY core.

DATABASE
- DO NOT rerun the legacy migration if the V1.1.2 migration + postcheck already succeeded.
- Existing consolidated Re-Med database is preserved.
- employees remains the ONE canonical employee master.
- No remed_employees table is introduced.
- Legacy historical balances remain preserved as opening history.

DATABASE POSTCHECK ALREADY CONFIRMED IN THIS RELEASE LINE
- 37 legacy entitlements.
- Total legacy plafond: 129000000.
- Historical used: 25388104.
- Historical available: 103611896.
- 0 unmapped legacy employees.
- 1 legacy reimbursement record.
- Re-Med private storage/RLS already present.

COPY
1. Extract this ZIP.
2. Copy ALL contents inside COPY_TO_HARMONY_APP.
3. Paste into D:\WEBSITE\harmony.app.
4. Choose Replace / Overwrite.
5. Do NOT replace/delete .env.local, .git, or node_modules.

BUILD GATE
cd D:\WEBSITE\harmony.app
npm run build

IF BUILD FAILS
STOP. Do not commit/push/deploy. Send the complete build error.

ONLY IF BUILD PASSES
git status
git add .
git commit -m "feat: integrate Re-Med as a Harmony module with single login"
git push origin HEAD:main

ACCEPTANCE TEST
- /login has no Re-Med swipe/carousel.
- Employee login -> /employee/dashboard -> RE-MED menu appears if access is active.
- HR login -> /hr/dashboard -> RE-MED menu appears if access is active.
- Finance login from the same /login -> /remed/finance/dashboard.
- Employee Re-Med pages show HARMONY sidebar + Re-Med section.
- HR Re-Med pages show HARMONY sidebar + Re-Med section.
- Finance cannot access HARMONY HR pages.
- Attendance, Leave, PHL, approvals, reports remain unchanged.
