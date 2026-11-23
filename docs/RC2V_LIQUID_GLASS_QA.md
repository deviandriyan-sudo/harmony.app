# HARMONY RC2V — Liquid Glass theme unification

**Base:** `fix/rc2u-unslop-enterprise` (RC2U, locally verified by project owner).  
**Candidate:** `fix/rc2v-liquid-glass-unification`.

## Goal and visual direction

The owner confirmed RC2U's layout is suitable, but the theme is inconsistently glassy. RC2V keeps the compact layout and gives HARMONY a stronger **iOS-inspired Liquid Glass** material: real backdrop blur, color saturation, translucent gradient tint, an inner specular rim, subtle elevation and adaptive dark/light color ramps.

References: Apple's Human Interface Guidelines, *Materials* and *Meet Liquid Glass* (WWDC25). The platform material is proprietary/native; these styles are a cross-browser CSS interpretation, **not** Apple's native renderer or exact physical refraction. The shell and navigation are visually glass-dominant; data content still has solid, readable controls and rows.

## Root cause

The app already had blurred glass styling in `app/globals.css` but RC2U's **later** `app/harmony-rc2r-design-system.css` layer gave the sidebar `backdrop-filter:none !important`, changed navigation/card backgrounds to fully opaque colors, and removed elevation. Thus glass materials disagreed between pages and themes.

## Changed implementation

1. Shared light/dark material tokens (`--hrui-glass-*`) in the **already imported** RC2R stylesheet.
2. Restored actual blur + saturated transparent gradients for navigation/sidebar, topbar, module nav, search, theme popover and mobile header. Added specular highlight and mild shadow/reflection (no animated shader or external assets).
3. Outer cards, compact metrics and SCALE UP/profile/Re-Med presentation panels use the same frosted surfaces; their inner form controls, options, toggles, uploads and table cells remain solid and readable.
4. Existing sidebar active state remains blue for navigation recognition, with a refined glass rim. Existing RC2Q employee hero **retains the real campus photograph**.
5. Employee/HR/Finance/Re-Med layouts are covered through the existing shared class selectors. No menu, module or layout hierarchy change.
6. Fallback for `prefers-reduced-transparency`, `prefers-contrast: more`, and browsers without `backdrop-filter`. Mobile blur is deliberately declared **before** these fallbacks.
7. No extra CSS file or import added. No package dependency added.

## Non-negotiable exclusions

No modifications to `app/api`, `lib/server`, Supabase, RLS, SQL, role/approval validation, employee attendance submit, PHL expiry logic, SCALE UP training approval, Re-Med claims, print or financial calculations. Existing `.env.local` remains untouched. No external script, shader, SVG remote filter, library or downloaded Apple material is used.

## Validation stages

Remote checks can verify source/diff/brace and contrast-token structure. They **cannot** prove browser-native optical appearance, frame rate, working dialogs, data integrity in the real database, or production readiness.

On Windows in the HARMONY working copy:

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
npm.cmd run test:modal-route-audit
npm.cmd run test:remed-print
node .\scripts\test-avatar-profile-ui.mjs
npm.cmd run build
npm.cmd audit --omit=dev
```

Test each command's exit code. Do **not** deploy based on the static guard alone.

## Browser QA matrix

- Chromium/Chrome on Windows with Light/Dark/System preference, desktop ~1440px, tablet ~768px, phone ~375px.
- Sidebar collapsed/expanded/pinned, route switch, active state, focus outline, notification popover and global menu search.
- Dashboard employee campus hero, KPI cards, separate Cuti / Klaim PHL / Tidak Hadir team columns.
- Attendance native select, checkboxes and submit, absence status pills, future-day behavior and attachments.
- Leave/Cuti dialog overlay, close/Escape, scrolling, date selection and document upload.
- Supervisor approval Absensi/Cuti/PHL, particularly disabled PHL approvals beyond validity limits.
- SCALE UP request forms, searchable approvers, document uploads and stage progress.
- Re-Med claims/financial forms, preview, A4 print preview and signature boundaries.
- Employee profile/settings and HR screens; no text submerged in the glass, no contrast regression.
- Test Reduce Transparency/Increase Contrast, `prefers-reduced-motion`, forced colors where supported and browser with disabled blur.
- Inspect scroll performance especially dashboard/team cards, as simultaneous backdrop filters may impact low-end mobile GPU.

**Status:** Feature branch only. No deployment, production merge, SQL, or automated browser screenshot QA.
**Rollback:** Switch to the clean RC2U branch; the change has no data migration.
