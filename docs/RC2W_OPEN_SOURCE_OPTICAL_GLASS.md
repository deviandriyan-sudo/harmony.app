# HARMONY RC2W — Open-Source Optical Liquid Glass

**Baseline:** `fix/rc2v-liquid-glass-unification`  
**Feature branch:** `feat/rc2w-open-source-optical-glass`  
**Scope:** presentation, delegated pointer highlights, accessibility and regression guards; no business logic, APIs or database change.

## Why RC2V still felt flat

RC2V used a blur and semi-transparent fill across large areas, but lacked directional specular light, asymmetric refractive rims, lower meniscus shading and active motion. Some earlier opaque components remained in the same screen. An indiscriminate increase in blur would degrade HR tables and responsiveness.

## Source-based implementation (actual upstream code, not just visual inspiration)

**AndreyBegma/glass-ui**, MIT license:
https://github.com/AndreyBegma/glass-ui

Original source files examined:

- `src/material.css` — seven-layer material, distinct `glass`, `glass-strong`, `surface-content`, and glint/press behavior.
- `src/tokens.css` — theme-dependent saturation, brightness, scrim, specular rim, meniscus, refraction ring and shadow.
- `src/material-light.tsx` — one delegated `pointermove` listener for all opted-in controls, 16 ms throttling, desktop hover-only, event cleanup.
- `LICENSE` — full original MIT notice preserved at `docs/licenses/GLASS_UI_MIT.txt`.

The adapted `components/theme/HarmonyMaterialLight.tsx` is based on the upstream MIT component, modified only for HARMONY's class name, accessibility gates and React/Next.js App Router integration. It uses no `eval`, dynamic scripts, network calls, injected HTML, or user data.

The material **is actively integrated** into the existing HARMONY CSS (not copied as a dormant or unused vendor file). Its foreground/background are mapped to the existing `data-harmony-theme` system, so the single root ThemeProvider and saved preferences are unchanged.

## Applied glass architecture

- **Material chrome:** sidebar, topbar, navigation tabs, notification/theme popovers, mobile header and modal surface use seven optical layers and theme-aware `backdrop-filter: blur(...) saturate(...) brightness(...)`. Stronger scrim is used for dialog/popover text.
- **Content:** dense HR tables, attendance history, financial records, metrics, SCALE UP and profile cards use a near-opaque but beveled **surface-content** rung. The inset rim and meniscus make it dimensional without individual GPU blur passes per cell.
- **Canvas:** three restrained, non-animated blue/neutral gradients create an actual background behind floating glass; the legacy heavy pseudo-element blobs are disabled inside the workspace.
- **Motion:** `HarmonyMaterialLight` mounts once in the root layout. Its limited opt-in targets include sidebar links, module nav, theme toggle, topbar action/search, employee dashboard and HR dashboard actions. A 130–180 ms light/press response is functionally informative; no continuous animation runs.
- **Login:** the login shell receives the stronger theme-aware material; sign-in, reset-password, callback, and input handling remain unchanged.
- **Theme compatibility:** the optical recipe custom properties are redeclared on `html[data-harmony-theme='dark']` and `html[data-harmony-theme='light']` to prevent computed root token inheritance from freezing the Light Mode material in Dark Mode.

**This is a CSS optical approximation of Liquid Glass**, not Apple's proprietary native rendering or a live refracting WebGL/SVG shader. The mouse-responsive glint and layered material are real interactive effects.

## Evaluation of other referenced open-source repositories

| Repository | Decision | Reason |
|---|---|---|
| `rdev/liquid-glass-react` (MIT) | No runtime import | Current `src/index.tsx` generates WebGL displacement maps and uses `navigator` in the render path; not appropriate as a global App Router HRIS shell without targeted client-only/performance testing. |
| `DavidHDev/react-bits` (MIT + Commons Clause) | No runtime import | Continuous animation and extra interactive scripts are unnecessary for mission-critical data tables; licensing must be respected if future code is copied. |
| `artyhoo/shadcn-glass-ui-library` | No runtime import | Component library overlaps existing HARMONY components. Upstream package describes MIT while the examined `LICENSE` file is Apache-2.0, so preserve existing controls rather than guessing at copied code rights. |
| `heydamir/unslop` (CC BY 4.0) | Design-review guidance retained | RC2U's information hierarchy and restrained copy remain. Its skills are instructions, not frontend runtime. |
| `next-themes` | Not installed | Existing `HarmonyThemeProvider` already handles Light/Dark/System and persistence; a second provider risks hydration and theme conflicts. |
| Other `glass-ui` ZIP variants | Not copied | Prior uploaded archive contents were not accessible for byte-for-byte verification in this turn. Public, independently verified MIT `AndreyBegma/glass-ui` code was used instead. |

## Security and regression boundaries

No database SQL, Supabase policy, credentials, RLS, route, workflow RPC, upload validation, cron, approval eligibility, medical-reimbursement payment logic or print component was changed. No new npm dependencies, external CDN, compiled shader binaries or remote CSS imports.

`MaterialLight` only writes `--harmony-lx`, `--harmony-ly`, and `--harmony-lit` CSS variables on hovered opted-in controls; it does not transmit pointer coordinates or read typed text. The listener unmounts on cleanup and does not run on touch-only devices or when reduced motion, contrast or transparency preferences are active.

## Required local QA before merge

Use Windows PowerShell from a clean checkout of the feature branch.

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
npm.cmd run test:rc2v:glass
npm.cmd run test:rc2w:glass
npm.cmd run test:modal-route-audit
npm.cmd run test:remed-print
node .\scripts\test-avatar-profile-ui.mjs
npm.cmd run build
npm.cmd audit --omit=dev
```

Check every native process exit code, not just final output. For manual browser QA: Chrome/Edge desktop Light/Dark/System, compact/mobile widths, sidebar hover/expand/pin, topbar search, notification dropdown, modal focus/scroll, theme toggle, employee/HR metrics, SCALE UP, attendance proof/submit, Re-Med claim and print. Also inspect Firefox/Safari fallback. Enable Reduce Motion and Reduce Transparency; inspect browser performance on a low-end machine while scrolling a long HR table. Use only controlled test records for write actions.

### Validation status

Changes are committed to a **feature branch only**. Source-structure and diff inspections do not prove that browser visuals, TypeScript or production build are successful. Do not merge into production `main` until Windows tests and browser QA pass. No SQL rollback required. Return to clean RC2V branch to undo presentation changes.
