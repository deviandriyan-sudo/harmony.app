# HARMONY RC2Z — CSS Cascade Diagnostics & Manual Visual QA

**Base:** `fix/rc2y-glass-accessibility-hardening` at `de032d27474552c184543506f07d404958e8e725`
**Branch:** `fix/rc2z-css-visual-diagnostics`
**Scope:** non-invasive diagnostics and removal of one verified ESLint warning. **No production CSS, business logic, authentication, database, print or dependency changes.**

## Evidence: Windows RC2Y local validation (user-supplied console output, 24 November 2026)

- `npx.cmd tsc --noEmit`: PASS (no failure raised by script).
- `npm.cmd run lint`: exit 0, one warning in `scripts/test-rc2i-source-guards.mjs` about unused `app`.
- Smoke: PASS, 66 pages + 60 API routes = 126 route entries. Local `.next` / TypeScript cache warnings are expected.
- RC2Q–RC2Y frontend guards, modal audit, Re-Med print, PHL links, upload security, auth binding, SCALE UP, RC2P: PASS as reported. Some tests are source guards and not E2E.
- Next.js 16.4.6 `next build`: PASS including TypeScript and page generation; Node `DEP0205` warning is non-fatal.
- `npm.cmd audit --omit=dev`: reported 0 vulnerabilities (audit report is not a security guarantee).
- Manual computed-style browser matrix and real Supabase workflow actions: **NOT RUN / no submitted evidence**.

## Source diagnostic (RC2Y; GitHub verified)

Nine root CSS entrypoints imported by `app/layout.tsx`, in order:

| Stylesheet | Lines | Literal `!important` occurrences | `backdrop-filter` occurrences |
|---|---:|---:|---:|
| globals.css | 5,019 | 1,119 | 302 |
| theme-normalization.css | 313 | 100 | 4 |
| contrast-hardening.css | 123 | 34 | 2 |
| employee-master-contrast.css | 80 | 34 | 0 |
| remed-payment-print.css | 219 | 108 | 2 |
| theme-contrast-rc2n.css | 136 | 39 | 0 |
| harmony-compact-rc2o.css | 103 | 26 | 8 |
| harmony-rc2q-employee-attendance.css | 83 | 7 | 2 |
| harmony-rc2r-design-system.css | 1,598 | 507 | 65 |
| **Total** | **7,674** | **1,974** | **385** |

Counts are text-occurrence heuristics, not distinct selectors or confirmed cascade conflicts. Prefixed and unprefixed declarations may contribute twice.

Confirmed source architecture:
- Older `globals.css` includes broad workspace and table blur rules.
- RC2R–RC2X adds later overrides for chrome, forms, Attendance and accessible fallbacks.
- RC2X provides explicit Attendance panel and metric selectors and RC2W pointer optics.
- `remed-payment-print.css` remains an independent print entrypoint. Do not consolidate without print validation.

## RC2Z changes

1. Remove unused `fileURLToPath` import and `app` declaration in `scripts/test-rc2i-source-guards.mjs`. RC2I assertions remain unchanged.
2. Add `scripts/browser-rc2z-ui-audit.js`: standalone, read-only DevTools probe for browser computed styles. No text, input values, API calls, credentials, cookies or localStorage are accessed. This is not imported into runtime.

## Browser QA procedure

1. Use a QA account, run `npm.cmd run dev`, open `http://localhost:3000`.
2. Copy `scripts/browser-rc2z-ui-audit.js` into Chrome/Edge DevTools Console, then inspect its table and summary.
3. Check viewport 375px, 768px and 1440px on Employee Dashboard, Attendance, Leave, Approvals, HR Dashboard, SCALE UP and Re-Med.
4. For current RC3A, test **Light only**; dark/system checks in the historical RC2Z document are superseded by the approved Light-only theme requirement.
5. Verify modals, Escape, keyboard focus, form fields, native select lists, print preview, reduced motion/transparency and large tables.
6. The probe reports absent selectors, which can be normal on another route. A gradient does not prove readability, and a disabled backdrop can be intentional.

The probe cannot certify WCAG compliance, perceived quality, GPU cost, workflow correctness, or Supabase RLS.

**No SQL migration required.**

_This document retains the RC2Z diagnostic findings; the test matrix was updated for RC3A Light-only scope._
