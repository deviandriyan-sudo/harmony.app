# HARMONY RC2Y — Live Glass Accessibility Hardening

**Base:** `fix/rc2x-visible-liquid-glass` at `cfc18aae5d346ac3a0b40df2c3c0e8c85faabdf8`
**Branch:** `fix/rc2y-glass-accessibility-hardening`
**Scope:** client-only pointer illumination and one static regression guard. No form, business logic, RLS, API, SQL, upload, print, auth or dependency changes.

## Verified source-level issue

RC2W/RC2X's `HarmonyMaterialLight` read four media queries only once when the component mounted. If the user activated Reduced Motion, Reduced Transparency, or Increased Contrast after opening the site, the mounted `pointermove` listener kept writing the optical CSS variables. Conversely, changing from a non-hover device or a restrictive preference to an eligible configuration could not enable illumination until reloading. The existing CSS fallback remains the source of truth for opaque surfaces.

## Implementation

- Subscribe to `change` events for pointer capabilities and all three accessibility media queries.
- Attach exactly one delegated `pointermove` listener only while desktop hover is eligible and accessibility restrictions are off.
- Detach the listener immediately and reset the active surface's `--harmony-lit` on each relevant preference change.
- Restore illumination when eligible again without requiring a page reload.
- Preserve the original 16 ms throttling, passive pointer event, hover-scoped selection, reset on pointerleave/blur, and cleanup on unmount.
- Fix the source license notice path; original MIT notice remains unchanged.
- Add `npm.cmd run test:rc2y:accessibility` as a **static source guard**, not a browser-test substitute.

## Verification status

- GitHub branch creation and commits: verifiable remotely.
- Source review: completed for touched files and dependent RC2W/RC2X guards.
- Windows TypeScript / ESLint / production build / `npm audit`: **NOT RUN** from the GitHub connector.
- New Node static guard: **NOT RUN** until checked out locally.
- Visual QA and E2E workflows: **NOT RUN**. The source change does not prove accessibility behavior on real browsers.

## Windows validation

Use a clean local Git worktree and fetch the new branch. Run these in the project folder:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run test:rc2w:glass
npm.cmd run test:rc2x:glass
npm.cmd run test:rc2y:accessibility
npm.cmd run test:theme
npm.cmd run test:theme-normalization
npm.cmd run test:modal-route-audit
npm.cmd run test:remed-print
npm.cmd run test:upload-security
npm.cmd run test:scaleup
npm.cmd run build
npm.cmd audit --omit=dev
```

Inspect each exit code. Run the remaining RC2Q–RC2V and business guard matrix before release.

### Manual browser reproduction

1. Desktop Chrome/Edge, Light mode, open Employee Attendance and hover a glass panel. Expect the optical glint to follow the pointer.
2. Without refreshing, enable Reduced Motion (or Increased Contrast / Reduced Transparency) in OS/browser emulation. The highlight should stop immediately; when available, inspect `getComputedStyle(surface).getPropertyValue('--harmony-lit')` (expected `0` on the formerly active surface).
3. Disable the accessibility preference without refreshing; the glint should return on the next pointer move.
4. Test hover-capability transitions, keyboard-only use, and tab switching. Test Firefox/Safari fallback, 375/768/1440px and Light/Dark/System.
5. Confirm no flicker during long Attendance table scrolling and no modification of attendance, approvals, payment, upload or print workflows.

## Risks and rollback

Risk is limited to presentation feedback: browser MediaQueryList behavior and whether illumination reactivates. It does not modify data or access control. If issues occur, return to the RC2X commit/branch after keeping the local worktree safe; no database rollback is needed.

**No SQL migration required.** Do not merge to `main` before local build and browser QA.
