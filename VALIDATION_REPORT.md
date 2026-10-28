# VALIDATION_REPORT — HARMONY V3.8.5

Environment: container Node.js v22.16.0; Windows target uses user's actual machine / Next.js 16.2.7 / React 19.2.4.

## Executed PASS (static/source tests)

| Command / check | Outcome |
|---|---|
| `npm run test:theme-normalization` | PASS: role component hooks, persistence token coverage, status/table pair contrast >=4.5:1 in both themes, 112-route invariant |
| `npm run test:theme` | PASS |
| `npm run test:login-motion` | PASS |
| `npm run test:smoke` | PASS: 64 pages, 48 API routes, no missing SQL file |
| `npm run test:ui` | PASS: role actions and periods |
| `npm run test:modal` | PASS: leave portal focus/overlay/scroll |
| `npm run test:hr-modal` | PASS: accordion/card sizing and scroll |
| `npm run test:avatar` | PASS |
| `npm run test:motion` | PASS |
| `npm run test:ptkp` | PASS: nine cases |
| `npm run test:balance` | PASS: annual leave correction safeguards; source SQL included, DO NOT rerun migration |
| TypeScript AST parser (global TS installation) | PASS: 197 TS/TSX/JS files without parsing errors; **not a full typecheck** |
| tinycss2 parse | PASS: 0 top-level syntax errors in legacy and normalization stylesheets |
| Chromium isolated component fixture | PASS: tested both light/dark at 360/390/768/1024/1440/1920 px; no horizontal overflow in fixture; checked computed foreground/surface pair. **Not full application** |

## Not completed / blocked

- `npm ci`: did not finish within the limited network/runtime window. Partially created `node_modules` was intentionally excluded from delivery.
- `tsc --noEmit`: not valid in this runtime with partially installed packages (`TS2688`, missing implicit type declaration packages).
- `npm run lint`: NOT RUN to completion (`eslint: not found` because npm installation incomplete).
- `npm run build`: NOT RUN to completion (`next: not found` because npm installation incomplete).
- No access to authenticated real-world HR/Finance/Employee pages, database records or Vercel deploy from this runtime. No end-to-end workflow simulation or complete WCAG/visual regression attestation.

## Target Windows release gates

Run every command from `INSTALL.md`; **do not deploy until `npm ci`, `npx tsc --noEmit`, lint (if configured), all tests and production build succeed.** Review the four reported routes and high-risk workflows in both modes after preview deploy. If lint emits baseline warnings, record separately from any newly introduced errors.

## Regressions guarded by source tests

- Same route inventory and role entry points; no deletions.
- Supabase auth + HR approvals + leave/PHL + Re-Med + finance handlers unchanged.
- ThemeProvider key (`harmony-color-theme`) untouched.
- Campus photo + upright login logo + unfold motion retained.
- Modal portal, focus trap, scroll lock preserved.
- Private storage and email notification integration untouched.
