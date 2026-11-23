# HARMONY RC2U — Unslop enterprise UI refinement

**Candidate branch:** `fix/rc2u-unslop-enterprise`
**Baseline:** `fix/rc2t-form-readability`
**Purpose:** Make HARMONY look and behave like a purpose-designed HRIS, with consistent low-noise dashboard hierarchy, while retaining all workflows and authorization logic.

## Source and attribution

The nine-pass design method is adapted from **Unslop**, created by Damir Sokolovsky (@heydamir), https://github.com/heydamir/unslop (CC BY 4.0). The uploaded reference image `blob.webp` is deliberately **not** used as HARMONY artwork: its glossy abstract form is an example of decoration the skill advises against for operational dashboards. No executable scripts, examples, code, tracking, remote fonts, or libraries from the external repository were installed.

## Five-line direction

- **Product:** A role-based HRIS for employee administration, attendance, leave, PHL, training and medical reimbursements.
- **Character:** Restrained, exact, dependable.
- **World:** Personnel records, verified time data, approvals, auditability and the actual campus.
- **Moments:** The campus photograph on the employee dashboard; meaningful data figures and approval states inside the workspaces.
- **Signature:** A single blue selection/action accent paired with semantic green/amber/red status indicators.

## Audit: visually confirmed from RC2S/RC2T screenshots, November 23

1. Dense, saturated navy was used on almost every panel, so information hierarchy was lost.
2. Gradient-blue heroes, floating blurred color blobs and decorative glass shapes competed with actual data.
3. Nearly every metric had a large icon and a hue of its own; users had to scan icons before numbers.
4. Uppercase, overly tracked eyebrow text, oversized greetings and generic hype copy weakened product identity.
5. Nested rounded pills, broad shadows and taller-than-needed navigation rows reduced information density.
6. SCALE UP, Cuti, Re-Med and profile forms had native select contrast problems in Dark Mode; **RC2T** is preserved as the fix for these, not reimplemented in this change.
7. Empty progress cards had fixed tall areas but little meaningful content.
8. A true campus image was already present; it should remain the one visual accent, with text legible over its dark side.

## Changes by Unslop pass

1. **Spacing:** Navigation rows 40px, icons 30–32px, shared cards 14px radius, controls 9–12px, workflow placeholders shortened from 202px to 148px.
2. **Color:** More neutral gray-ink ramps for Light/Dark; semantic statuses remain distinct, accent blue is used for selected navigation and actions rather than as every surface.
3. **Icons:** Data-first dashboard metric component no longer renders a decorative large icon; Lucide icon prop is kept in its public TypeScript signature for compatibility with existing callers.
4. **Copy:** Employee hero explains the actual page (`Ringkasan kepegawaian`); HR hero describes real monitoring. Personal identity and attendance cutoff still appear directly in the employee hero.
5. **Type:** Simplified kicker tracking/capitalization, restrained 600-weight titles and tabular metric values.
6. **Layout:** Existing page sections, route order, employee workflow progress, team information and role-specific navigation are retained; reduced heavy card radius and chrome bulk.
7. **Details:** Metric color gradients replaced with quiet surfaces and narrow meaningful edge markers; navigation selection is a solid brand blue, not a glowing gradient.
8. **Visuals:** Retained `harmony-campus.jpg` with feathered right-side mask on the employee hero; hid entirely decorative glass scene and removed floating color-glow divs from Leave and Supervisor heroes.
9. **Motion:** Removed dashboard metric hover translation, stronger shadow animation and unnecessary decorative visual motion; existing focus, reduced-motion and functional progress affordances are preserved.

## Change surface and security exclusions

- Changed: shared theme/compact CSS already imported, employee dashboard and HR dashboard presentation, supervisor/leave hero decoration, CompactMetric, sidebar, topbar, test script, package test registration.
- Deliberately unchanged: Supabase clients and database, SQL migration, Next.js API routes, RLS, auth, employee data loading, PHL validity, training approvals, Re-Med amounts and uploads, attendance submit/checkbox/manual workflow, scheduled cron, PDF/print rules.
- No new CSS entrypoint, plugin runtime, theme library, JavaScript dependency or remote resource.
- This change is a **broad shared-component pass**, not a claim that every specialized HR/Finance/medical screen has already received a bespoke audit. Do not treat static code guards as browser evidence.

## Mandatory Windows checks

Use a clean worktree, then fetch/switch to the candidate branch. In Windows PowerShell:

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
npm.cmd run test:rc2u:unslop
npm.cmd run test:modal-route-audit
npm.cmd run test:remed-print
node .\scripts\test-avatar-profile-ui.mjs
npm.cmd run build
npm.cmd audit --omit=dev
```

Check each process exit code rather than assuming that subsequent PASS logs make an earlier failure irrelevant.

## Manual visual and interaction QA

At 1440, 768 and 375px, compare Light/Dark/System theme on:
- Employee Dashboard: campus mask, real name and period, figures, workflow progress, three team columns and supervisor link.
- Employee Attendance: active/approved period, manual form, attachment picker, period select-all and submit, future-date labels, table contrast.
- Cuti: request modal and native select options in Windows Chrome, dates, summaries, upload and keyboard focus.
- Supervisor: Approval Absensi/Cuti/PHL, expired PHL disabled action, queue status, employee details.
- SCALE UP: form type dropdown, date and training budget inputs, approval candidates.
- Re-Med: employee claim form and payment bank, uploads, printable documents.
- Employee Profile/Settings and HR/Finance screens: typing, documents, modals, notifications, navigation and theme contrast.

No real approvals, payments, notifications or data mutations should be performed for QA except with controlled test records. Verify horizontal scroll only inside large tables, contrast at keyboard focus, and no clipped content.

**Validation:** GitHub source/diff and static tokens can be reviewed remotely; local TypeScript, ESLint, smoke, build, browser render and end-to-end flows are **not** verified remotely. Keep branch separate from production `main` pending Windows/browser QA. Roll back by switching to the clean RC2T branch; no SQL rollback necessary.
