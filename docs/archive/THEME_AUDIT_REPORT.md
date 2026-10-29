# THEME_AUDIT_REPORT — HARMONY V3.8.5

Date: 2026-10-27. Authoritative baseline: supplied `HARMONY_V3.8.4_CAMPUS_DUAL_THEME_FULL_REPLACEMENT(1).zip`.

## Scope and complete route inventory

- Page routes: **64**, unchanged from the baseline.
- API routes: **48**, unchanged from the baseline.
- Page roles: Auth / public / common 5, Employee 15, Finance 6, HR 25, Re-Med Employee 5, Re-Med HR 8.
- Full canonical inventory, including dynamic route segments: `ROUTE_INVENTORY_V385.csv`.
- Sources inventoried: `app/**/*.tsx`, reusable `components/**/*.tsx`, theme provider/toggle, `app/globals.css`, print contexts, and historical regression scripts. API code was preserved.
- Every page is subject to the shared semantic CSS. Route presence was statically verified. Authenticated browser verification per page was not possible.

## Confirmed root causes and remediation

| Component / route | Mode / symptom | Root cause from source | Correction | Regression risk / validation |
|---|---|---|---|---|
| `app/globals.css` / all roles | Dark headings appear white even on pale gradient surfaces | Blanket `h1,h2,h3,h4,label { color: var(--h-color-text)!important }` across nested containers | Removed global heading override; explicit `.harmony-text-*` classes and surface-aware foregrounds instead | Typography inheritance may differ on rare decorative components; static checks PASS, authenticated visual QA pending |
| 50+ app/component files | Fixed `text-[#1d1d1f]`, `text-[#6e6e73]`, etc. do not follow theme | Legacy Tailwind arbitrary hex utilities, approximately **1116** occurrences across the ten prioritized tokens | Normalized these occurrences to semantic primary/secondary/muted/link and status-foreground utilities; remaining prioritized legacy occurrences: **0** | Preserve status / hero colors as deliberate exceptions; source checks PASS |
| `/hr/employees` | Faded balances and detail/edit controls | Dark role CSS recolored light cards, without a matching explicit foreground and button style | Scoped employee directory/homebase/balance/action classes | Employee data and action callbacks unchanged; visual fixture PASS |
| `/hr/attendance` | White-on-pale step descriptions and helper boxes | Light gradients coupled with dark-mode global heading forcing | `.harmony-attendance-step-card`, helper, secondary and tool links with matched surface/foreground states | Workflow URLs and logic unchanged; visual fixture PASS |
| `/hr/attendance/upload` | Download icon looks disabled | Inconsistent white control on grey table and dim backgrounds | Separate download/delete semantic action variants, stable icon contrast, meaningful `aria-label` | Signed private URL and deletion handlers untouched; visual fixture PASS |
| `/hr/attendance/approvals` | Table header, zero badges, status badges washed out | Tabular data uses pale neutral pills and unstable inherited color | Dedicated table header, neutral indicator, success/danger token pairs | Counts and approval calculations untouched; visual fixture PASS |
| `/remed/employee`, `/remed/hr`, `/remed/finance` | Different status color semantics across roles | Fixed pastel badge classes | `ClaimStatusBadge` now retains status data attribute and shared role-independent status palette | Claim workflow and payment state unmodified; token contrast PASS |
| `/reset-password` and `/auth/callback` | Outside `.harmony-workspace`: dark theme inherited foreground can mismatch white surfaces | Legacy public page hardcoded glass backgrounds | Theme-aware `.harmony-public-page` and `.harmony-public-shell` | Authentication handlers unmodified; full browser auth flow pending |
| `/remed/*/claims/[id]/print` | Dark theme may cause white text on white paper | Print content inherits global dark text tokens | `.harmony-print-document` white-paper context, independent of theme | Print content source unmodified; needs manual browser print QA |
| Modal portals / shared shell | Overlay is outside role workspace, some styles not inherited | Portal to `document.body` | Context-independent document-level modal surface and focus ring CSS | Escape, trap, scroll-lock tests PASS |

### Styling architecture

- Source of truth remains `data-harmony-theme=light|dark` and localStorage key `harmony-color-theme`.
- `app/theme-normalization.css` imported after legacy `app/globals.css`; no additional React provider or npm dependency.
- New tokens cover surfaces, primary/secondary/muted text, controls, tables, semantic statuses and modals, with deliberate dark/light parity.
- Legacy hardcoded foregrounds were replaced where semantically safe; semantic status colors and brand illustration accents were intentionally preserved.
- Existing monolithic global stylesheet remains historically large (~4,834 lines); it was not wholesale deleted due high regression risk. Global forced heading override removed.

## Accessibility and verification limits

- Programmatic palette ratio checks: seven selected table/status text pairs per theme, **all >=4.5:1** (about 6.6:1 to 10:1 by token value).
- Chromium rendered isolated component fixture (not actual production pages) at 360, 390, 768, 1024, 1440 and 1920 px in light and dark: no fixture horizontal overflow.
- Icon-only HR upload and employee power controls now have accessible names.
- `prefers-reduced-motion` and `prefers-reduced-transparency` fallbacks retained.
- Actual contrast can change with translucency, loaded background imagery, and overlay context. Do not interpret token contrast as complete WCAG audit.
- **Unverified:** authenticated production browser across all 64 screens, mobile device-specific layout, browser print preview, end-to-end submission/approval/finance, dependency-based production build in this runtime.

## Screenshots mandatory regression set

1. HR employee directory: explicit matched surface and balance/button styles.
2. HR attendance four steps: dark-safe step body, helper, primary and secondary actions.
3. Attendance upload: coherent table and discernible download controls.
4. Attendance review: contrast-safe table header, zero values and status pills.

Source-level code and isolated fixture pass; final production comparison against uploaded screenshots should be executed after deployment.
