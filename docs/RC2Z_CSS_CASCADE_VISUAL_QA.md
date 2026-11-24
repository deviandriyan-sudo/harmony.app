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

The counts are **text-occurrence heuristics**, not the number of distinct selectors, rendered filters or confirmed CSS conflicts. For example, prefixed/unprefixed declarations can contribute twice.

Confirmed source architecture:
- The earlier `globals.css` defines broad `.harmony-workspace .bg-white` and table-header blur rules.
- RC2R–RC2X adds many later `!important` overrides for chrome, forms, Attendance and accessible fallbacks.
- RC2X provides explicit Attendance panel and metric selectors and RC2W pointer optics.
- `remed-payment-print.css` remains an independent print entrypoint. Do not consolidate it without dedicated print validation.

**Diagnostic priority:** find which computed declarations actually win in each context; verify mobile GPU cost, legibility, overlay stacking and fallback before changing or deleting any legacy rule.

## RC2Z changes

1. Remove unused `fileURLToPath` import and `app` declaration in `scripts/test-rc2i-source-guards.mjs`. All RC2I assertions and inspected file paths remain unchanged.
2. Add `scripts/browser-rc2z-ui-audit.js`: standalone, **read-only** DevTools probe for browser computed styles. The script only examines static selectors and CSS metrics: no text, input values, API calls, credentials, cookies or localStorage. It is *not* imported into the application and is *not* a Next.js runtime dependency.

## Browser QA procedure (no production write actions)

1. Use a **QA/test account** and `npm.cmd run dev` at `http://localhost:3000`.
2. In PowerShell, copy the probe contents to clipboard:

   ```powershell
   Get-Content -Raw '.\scripts\browser-rc2z-ui-audit.js' | Set-Clipboard
   ```

3. Navigate to a test route, open Chrome/Edge DevTools → **Console**, paste and execute the probe.
4. Capture the Console table/context and a corresponding screenshot, making sure no names, balances, ID numbers or other personal details are exposed. The probe output itself does not read form values or text.
5. Repeat at **375px, 768px and 1440px** using **Light, Dark and System** on:
   - `/employee/dashboard`, `/employee/attendance`, `/employee/leave`
   - `/employee/approvals`, `/hr/dashboard`, `/hr/attendance`, `/hr/employees`
   - `/employee/scale-up`, `/hr/scale-up`
   - `/remed/employee/dashboard`, `/remed/employee/claims/new`
   - Re-Med print preview in a separate `@media print` inspection
6. When a dialog is open, run the same probe again to capture its portalled surface. Check Escape, focus trap, keyboard traversal and body scroll restoration.
7. For Attendance, visually verify 2 glass panels, 6 metric surfaces, background depth, border colors and readable data. Inspect `--harmony-lit` when mouse enters/leaves. Toggle Reduced Motion/Transparency/Contrast without reloading to verify RC2Y's event behavior.
8. Check native select options, longest table scrolling, text contrast and fallback behavior. A `gradient: true` value does not prove legibility; a `backdrop: none` value can be intentional for accessibility or data-heavy content.

The probe intentionally reports missing surfaces because screens differ. It cannot certify WCAG compliance, perceived quality, browser GPU cost, workflow correctness or Supabase RLS.

## Validation and release conditions

- GitHub commit/source diff: remotely verifiable.
- ESLint and RC2I source guard after warning cleanup: **NOT RUN** until local checkout.
- Browser computed-style QA: **NOT RUN** until supplied from a real browser.
- Regression workflow/E2E: **NOT RUN**.
- No merge to `main`, no automatic deployment, no SQL migration.

**No SQL migration required.**

## Priority after evidence

1. Address P0 workflow/security issues only when reproduced with tests.
2. Remove verified dead/overridden CSS rules in small, file-scoped batches with screenshots and before/after computed styles.
3. Standardize form, modal, table and chrome material without applying blur to every data row.
4. Check both print routes after any shared typography/layout changes.
5. Run all TypeScript, lint, source guards, build, dependency audit and browser matrix before promoting the next release.
