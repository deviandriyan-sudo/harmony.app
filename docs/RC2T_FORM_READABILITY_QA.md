# HARMONY RC2T — Form Readability and Native Select Repair

**Base:** `fix/rc2s-contrast-layout-refactor` (RC2S).  
**Candidate branch:** `fix/rc2t-form-readability`.  
**Scope:** UX and presentation only; preserved all employee/HR/Finance/SCALE UP/Re-Med workflows.

## Screenshot findings and root causes

- Chrome/Windows native dropdown popup was light while option text inherited a
  light foreground from the Dark Mode parent. CSS had no explicit option/optgroup
  foreground/background pairing; native `color-scheme` differed between elements.
- The body-portaled Employee Leave modal was styled by a legacy forced light
  background while its heading/labels were affected by Dark Mode text overrides.
- Approval Cuti, Attendance, PHL, Re-Med claims, Profile Documents and Settings
  used fixed white/slate panels or low-contrast pills.
- Attendance displayed **Alpa** on future calendar days with no logs because
  `inferDailyType` classified a missing log as `absent` before the day occurred.

## Implemented

1. Use `color-scheme: light` for all native select dropdowns and explicit
   `#1a2d45` foreground / `#ffffff` background for option/optgroup.
   The closed select remains token-driven and theme-aware. Note that final
   popup rendering is OS/browser-controlled.
2. Convert legacy input/focus and Leave portal material from fixed white/blue
   to existing theme tokens. Add semantic hooks for Leave header/close/identity/
   balance tiles and footer. Keep the original modal portal/focus and submit.
3. Repair dark mode heading, table, empty-state, input, status badge and
   information-panel contrast on Supervisor Attendance/Cuti/PHL pages.
4. Add neutral shared Re-Med header and semantic new-claim/bank form surfaces.
5. Add semantic document accordion, status badge and upload area in Profile;
   standardize data-entry shells and instructions in Settings.
6. Employee Attendance: explicitly theme status, absence, non-working-day,
   approval, checkbox, complete and reset pills in both desktop/tablet views.
7. **UI-only future state**: workdays later than `getTodayISO()` in
   Asia/Makassar with no existing log, time entry, holiday or manual override
   and a default absent draft display `Belum berlangsung` / `Belum tercatat`.
   This does not modify persisted attendance, database views, period totals,
   exports, approvals or cutoff business logic. Related calculations and export
   treatment of future unrecorded days require a separate domain-level audit.
8. Static guards: `npm.cmd run test:rc2t:uiux`.

## Repository and security boundaries

- No changes to API routes, `lib/server`, `package-lock.json`, migrations,
  database roles, storage permissions, authentications or network requests.
- No external executable UI code copied and no new runtime dependencies.
- Existing Re-Med A4 print handling remains separate and unchanged.
- This release adds CSS rules **to the existing RC2R design stylesheet**,
  not another separately imported theme CSS layer.

## REQUIRED — Local Windows QA

Start from a clean Git worktree. Fetch and switch to the candidate branch,
then run:

```powershell
cd 'D:\WEBSITE\harmony.app'
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run test:smoke
npm.cmd run test:theme
npm.cmd run test:theme-normalization
npm.cmd run test:rc2q:frontends
npm.cmd run test:rc2r:uiux
npm.cmd run test:rc2s:uiux
npm.cmd run test:rc2t:uiux
npm.cmd run test:modal-route-audit
npm.cmd run test:remed-print
node .\scripts\test-avatar-profile-ui.mjs
npm.cmd run build
npm.cmd audit --omit=dev
```

Use a separate PowerShell script with `$LASTEXITCODE` checks if validating
every command automatically; PowerShell does not stop on each nonzero native
process status by default.

## Visual test matrix

- Chrome on Windows at desktop (1440px+), tablet (768px) and narrow (375px).
- Light, Dark, and System (including OS Dark/Light switch).
- Employee Attendance: row statuses, weekend, date before/after today, missing
  machine logs, checkbox select-all, buttons, and period submit guard.
- Cuti modal: open native `Jenis Pengajuan` (including disabled options),
  date selection, balance tiles, evidence, header, footer, keyboard Esc and scroll.
- Approval Attendance: month/year/status select popups, table and info panel.
- Approval Cuti: dark heading, search/filter, empty-state, table.
- Approval PHL: expired/active request badges, disabled approve and reject.
- SCALE UP: Training Type select, dates, cost, approver selection.
- Re-Med: claim category native dropdown, bank information, proof input,
  and print/A4 check.
- Profile/Settings: gender select, file upload, document accordion,
  labels, keyboard focus and input placeholders.
- Confirm no auth, role or RLS behavior change. Use test data for actions
  that would write production records.

## Validation status

Source-level GitHub comparison and static checks can be done remotely.
**Actual TypeScript compilation, browser rendering, Windows native dropdown
behavior, regression tests, package audit and production build MUST run locally.**
Do not merge this branch into `main` before they pass.

**Rollback:** Return to `harmony-rc2s-local-qa` or
`fix/rc2s-contrast-layout-refactor` once local worktree is clean.
No database rollback is required.
