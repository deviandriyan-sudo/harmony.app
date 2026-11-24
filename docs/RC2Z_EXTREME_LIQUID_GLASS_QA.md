# HARMONY RC2Z - Extreme Liquid Glass Material System

Baseline: RC2Y `de032d27474552c184543506f07d404958e8e725` (24 November 2026).

## Verified local-vs-GitHub source

The uploaded Windows source archive was compared against the GitHub RC2Y tree: 321 tracked files match at Git blob level after CRLF-to-LF normalization for text; binary assets match byte-for-byte. Local-only `next-env.d.ts`, `node_modules` and TypeScript cache were excluded from the release source bundle. No local uncommitted Git history could be inspected because the uploaded ZIP did not contain `.git`.

## Intent and change surface

Visible, intentionally expressive optical depth instead of a nearly opaque glass veneer. A single terminal CSS material layer `app/harmony-rc2z-liquid-glass.css` is imported after the existing RC2R design system. It shares the original single `HarmonyThemeProvider` and RC2Y pointer light; no new provider, shaders, external fonts, APIs, packages or scripts.

- Light/Dark token palettes: translucent chrome/sheets, optical rim, specular shadow, ambient background and foreground-safe text colors.
- Sidebar, topbar, module subnav, popovers, mobile shell, active nav, search and icon actions.
- Campus employee hero keeps its genuine photo/mask; generic heroes receive a unified optical frame.
- Data panels, metrics, Attendance (including actual RC2Q panel and six metrics), HR cards, employee/profile, SCALE UP and Re-Med surfaces.
- Inputs, file controls and tables intentionally preserve an almost opaque readable interior. No per-cell backdrop filter.
- Portal dialogs and login glass, without changing modal keyboard/focus/scroll management.
- Reduced Motion, Reduced Transparency, Increased Contrast and unsupported backdrop-filter fallbacks; print isolation via `@media screen`.

## Source/automated validation (container)

PASS: TypeScript `--noEmit` (Node 22; installed dependencies from the uploaded archive), CSS grammar parsing, regression guards RC2Q/RC2R/RC2S/RC2T/RC2U/RC2V/RC2W/RC2X/RC2Y/RC2Z, smoke, theme, normalization, modal route audit, Re-Med print, PHL attendance, upload security, auth binding, SCALE UP and RC2P dashboard/PHL. Twenty of twenty selected scripts returned exit code 0.

NOT RUN/INCOMPLETE: actual Windows production build after this change, complete ESLint run (time limit), real authenticated browser screenshot/computed style visual QA, end-to-end write workflows and database RLS checks. Chromium headless design preview timed out in the container; no visual PASS claimed. Earlier local RC2Y build success does not establish RC2Z production readiness.

## Mandatory Windows validation

```powershell
cd 'D:\WEBSITE\harmony.app'
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run test:rc2z:glass
npm.cmd run test:rc2x:glass
npm.cmd run test:rc2y:accessibility
npm.cmd run test:modal-route-audit
npm.cmd run test:remed-print
npm.cmd run test:upload-security
npm.cmd run test:scaleup
npm.cmd run build
npm.cmd audit --omit=dev
```

Run other RC2Q-RC2V tests too; inspect each command's exit code.

Visual matrix: Employee/HR Dashboard, Attendance, Leave, PHL, approvals, SCALE UP, Re-Med, profile/settings, modal portals, notification popovers, print preview; Light/Dark/System; 375/768/1440px; Chrome/Edge and Firefox/Safari fallbacks. Check contrast, focus rings, z-index, blur rendering, overflow, horizontal scroll, disabled buttons, printer/A4 and reduced-transparency settings. No production write actions during visual QA.

## Security, rollback and SQL

No API, database schema, RLS, policy, cron, auth, upload pipeline, financial calculation, or workflow change. Existing CSS is untouched; switching away from RC2Z branch or reverting the five-file overlay restores RC2Y visual material. Copying this source must never overwrite `.env.local`, `.git`, `.next`, or `node_modules`. **No SQL migration required.**
