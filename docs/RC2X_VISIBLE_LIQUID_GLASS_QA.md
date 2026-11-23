# HARMONY RC2X — Visible Liquid Glass: Attendance + Shared Material

**Base:** `feat/rc2w-open-source-optical-glass`  
**Branch:** `fix/rc2x-visible-liquid-glass`  
**Reported:** screenshots of 23 Nov 2026, Light/Dark, /employee/attendance. The material looked essentially solid in both modes.

## Verified source-level causes

1. RC2W added optics to several shared classes but **missed** the actual `harmony-rc2q-attendance-panel` and `harmony-rc2q-approved-metric` used by Attendance. RC2Q authored opaque surfaces for them.
2. Another RC2R CSS rule explicitly assigned a flat `--hrui-shadow` to `harmony-rc2q-attendance-panel`, masking optical depth.
3. The darker opaque scrim and near-opaque content fill (`.69` / `.94` dark) left too little visible background; even a working backdrop filter was difficult to perceive.
4. The workspace background had only low-contrast gradients; glass requires something behind it to refract.
5. The active navigation label appeared dark blue on a blue tab in Light Mode; a later role/text-specific rule could override the link's default color.
6. Search field focused styling could render a native-looking inner outline inside the glass wrapper.

Source inspection supports these root causes. The attached screenshots **do not prove which Git branch was running locally**; verifying the checkout is part of this QA.

## Remediation

- Add light/dark `--harmony-glass-panel-bg`, `--harmony-glass-metric-bg`, `--harmony-glass-inset-bg`, and `--harmony-glass-panel-filter` tokens to the existing optical stylesheet.
- Soften the chrome scrim and content opacity, increase contrast between the non-animated blue ambient background and floating glass. Use directional radial sheen rather than a uniform overlay.
- Wire RC2Q Attendance's real selectors in its existing stylesheet to the optical token fallback; apply final material via a specific rule in the existing RC2R stylesheet.
- Preserve semantic colored left borders for six attendance metrics and a solid inner information panel.
- Make the two top Attendance sections opt into the existing delegated pointer illumination with `harmony-liquid-surface`; disable the click shrink on broad panels.
- Keep form fields and rows solid and keep the Cuti, PHL, Re-Med, SCALE UP, print, Supabase, APIs, permissions and attendance records unchanged.
- Explicitly maintain solid opaque fallbacks for Reduce Transparency, Increase Contrast and browsers without backdrop filters.
- Correct active sidebar link descendant text and focus outline on the search wrapper.

## Local deployment and validation

The branch is NOT merged to production. Use a clean checkout and run:

```powershell
cd 'D:\WEBSITE\harmony.app'
git status --short
git fetch origin
git switch -c harmony-rc2x-local-qa origin/fix/rc2x-visible-liquid-glass
```

Run TypeScript, lint, smoke, theme, RC2Q/RC2R/RC2S/RC2T/RC2U/RC2V/RC2W/RC2X, portal, print, production build and `npm audit --omit=dev`. Check each exit code. No SQL migration or dependencies are needed.

## Browser verification — use the rendered DOM, not source checks alone

Start `npm.cmd run dev`, open `/employee/attendance`, and hard reload (`Ctrl+Shift+R`).

In Chrome Developer Tools → Console, run:

```javascript
const selectors = [
  '.harmony-rc2q-attendance-panel',
  '.harmony-rc2q-approved-metric',
  '.harmony-topbar',
  '.harmony-sidebar-panel',
]
console.table(selectors.map(selector => {
  const element = document.querySelector(selector)
  const css = element ? getComputedStyle(element) : null
  return {
    selector,
    present: Boolean(element),
    background: css?.backgroundImage?.slice(0, 110) ?? null,
    blur: css?.backdropFilter ?? css?.webkitBackdropFilter ?? null,
    pointerMaterial: element?.classList.contains('harmony-liquid-lit') ?? false,
  }
}))
console.log({
  branchMarkerPanel: document.querySelectorAll('.harmony-liquid-surface').length,
  theme: document.documentElement.getAttribute('data-harmony-theme'),
  reducedTransparency: matchMedia('(prefers-reduced-transparency: reduce)').matches,
  increasedContrast: matchMedia('(prefers-contrast: more)').matches,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
})
```

Expected in a regular desktop browser: two `.harmony-liquid-surface` elements, gradient background on Attendance panels, blur on the Attendance panel / topbar / sidebar, stronger optical light at pointer hover, and colored metric edge borders. If `reducedTransparency` or `increasedContrast` is true, a solid/no-blur fallback is **intentional**.

If this is not present, check `git branch --show-current`, restart the dev server and hard reload. A passed `test:rc2x:glass` is a static guard, not proof of the browser's computed styles.

## Manual visual QA

- Light and Dark: translucent Attendance panels, six metric tiles, Today's Attendance information block, History panel, sidebar active state and search focus.
- Light/Dark/System: dashboard, approvals, leave dialog and profile; ensure no loss of contrast or unintended clipping.
- At 375px, 768px and 1440px: readable status and form labels, scrollbars not trapped, no overlapping content.
- Keyboard only, tab/focus visible, Reduced Motion/Reduced Transparency, and Chrome/Edge + Safari/Firefox fallback.
- Performance: long attendance history scroll should not blur every table row or run continuous animations.
- Workflow smoke on test data only: mode toggle, monthly selectors, manual proof uploads, submit eligibility and print unaffected.

## Verification status

GitHub source guards and diff can be inspected remotely. Actual Windows TypeScript/lint/build, browser render and end-to-end data actions **must still be run locally**. Until then this branch is a visual QA candidate, not a production release. No database rollback is necessary.
