# HARMONY — Integrated HR Platform

**Version:** 3.8.5 · Enterprise Dual-Theme Normalization

Next.js 16 (App Router), React 19, TypeScript, Supabase and Vercel. Workspaces: HR, Employee, Finance and Re-Med. This package preserves existing business workflows and includes global Dark/Light semantic presentation refinements.

## Quick start

Run in a project directory containing your **existing** `.env.local` (never committed):

```powershell
npm ci
npm run test:theme-normalization
npm run test:theme
npm run test:smoke
npm run test:ui
npx tsc --noEmit
npm run lint
npm run build
```

Full existing regression suite, installation, backup and GitHub/Vercel deployment: [`INSTALL.md`](./INSTALL.md). Do not push until the checks succeed.

## Design system

- Theme preference: `harmony-color-theme` (existing provider; Dark/Light).
- Theme variables: `app/globals.css` and `app/theme-normalization.css`.
- Color, status, table, modal and printing guidelines: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).
- Routing and authorized workflow integrity: [`ROUTE_INVENTORY_V385.csv`](./ROUTE_INVENTORY_V385.csv) and [`THEME_AUDIT_REPORT.md`](./THEME_AUDIT_REPORT.md).
- Tests performed and environmental limits: [`VALIDATION_REPORT.md`](./VALIDATION_REPORT.md).
- Source changes: [`CHANGED_FILES.md`](./CHANGED_FILES.md).

Do not rerun already applied SQL migrations. The `SQL_ONLY` folder is retained for the original balance correction regression test and historical verification.
