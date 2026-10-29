# HARMONY — HR Platform, V3.8.5 Stage 7 review

Next.js 16.4.3, React 19.2.4, TypeScript, Supabase, Vercel, Tailwind. Employee, HR, Finance/Re-Med; attendance, leave, postpone, PHL, expense claims and notifications.

## Installation

Read the extracted ZIP's `START_HERE_STAGE7.md`. Replace all route-bearing source directories after backup; preserve `.env.local`, `.git` and historical SQL. No Stage 7 production SQL write migration is authorized or included.

## Developer checks

```powershell
npm ci
npm run test:stage7
npm run test:lifecycle
npm run test:smoke
npm run test:balance
npx tsc --noEmit
npm run lint
npm run build
```

View full automation limitations in `STAGE7_AUDIT_REPORT.md`. See `DESIGN_TOKENS_STAGE7.md` for semantic light/dark palette. Historical reports retained under `docs/archive`.
