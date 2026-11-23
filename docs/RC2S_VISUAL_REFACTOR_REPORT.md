# HARMONY RC2S — Contrast and Layout Refactor (QA Candidate)

**Baseline:** `feat/rc2r-secure-uiux` (RC2R), retaining the RC2Q employee dashboard/attendance redesign and feathered campus hero.

**Branch:** `fix/rc2s-contrast-layout-refactor`.

## Verified source findings

HARMONY ships a legacy `app/globals.css` with roughly 243 KB of rules and more than 1,100 `!important` declarations. Additional theme-specific layers use partly incompatible colors, including fixed white/gray profile and team cards. The resulting Dark Mode can put light text on light tiles and render buttons/tables with excessive outlines.

RC2S consolidates the dark palette and compatibility variables **inside the existing RC2R stylesheet**, and replaces selected hardcoded component classes with explicit semantic hooks. It does not install code from the seven external UI repositories; those remain references only.

## Implementation

- **Dashboard / Team:** semantic independent Cuti, Klaim PHL, Tidak Hadir column/card surfaces; readable badges, person metadata, handover and period filter in both themes.
- **Attendance:** compact period filter and review bar; dark table header/body readability. The existing checkbox, select-all, evidence and period submission workflows are unchanged.
- **Leave:** neutral readable balance details panel with preserved `<details>` behavior and leave request flow.
- **Supervisor approvals:** smaller hero, fewer visual layers, compact module KPI tiles and highlights. Links and approval counts unchanged.
- **SCALE UP:** form/metric/empty-state text, smaller spacing and consistent Dark Mode surfaces. Approval roles/policies unchanged.
- **Re-Med:** consistent titles and neutral panel contrast. No financial or entitlement logic touched.
- **Profile:** explicit `harmony-profile-panel` and `harmony-profile-field` tokens; readable input, labels and focus outlines. Profile/identity/avatars/documents still use the same API and auth.
- **Shared styles:** neutral slate-based dark palette rather than multiple competing dark blues; accessibility focus, reduced motion/transparency fallback preserved.
- **Regression:** `npm run test:rc2s:uiux` checks structural hooks, contrast of primary text and surfaces, and preserved key workflow affordances.

## Strict exclusions

No API or database function changes; no SQL migration, RLS change, package dependencies, route deletion, changed credentials, upload validation changes, print CSS changes or external runtime code. The source ZIPs of external libraries were **not** byte-for-byte validated.

## QA — required before production

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
npm.cmd run test:modal-route-audit
npm.cmd run test:remed-print
npm.cmd run test:avatar-profile
npm.cmd run build
npm.cmd audit --omit=dev
```

If `test:avatar-profile` is not registered in `package.json`, run `node scripts/test-avatar-profile-ui.mjs` directly.

Run visual browser QA as **an authenticated employee and supervisor**: 360px mobile, 768px tablet, 1440px desktop; Light/Dark/System (including OS preference switching); Dashboard / Team, Attendance period and manual upload, Leave modal, Supervisor approvals, SCALE UP, Re-Med and Profile. Also inspect HR and Finance because they share the design tokens. Verify table scroll, badges, button disabled state, print/A4 routes and modal focus. Use dummy/test records for actions that mutate database state.

**Status:** source changes committed to a feature branch, static source/diff inspection complete. Full TypeScript, build, actual browser interaction and visual/a11y checks have **not** been run in this environment. This branch must not be merged into production `main` until local checks and authenticated screenshots pass.

**Rollback:** switch back to `harmony-rc2r-local-qa` or `harmony-rc2q-uiux-baseline` after saving uncommitted changes. No SQL rollback needed.
