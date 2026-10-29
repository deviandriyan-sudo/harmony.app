# HARMONY V3.8.5 Stage 7 — installation

See top-level `START_HERE_STAGE7.md` **outside** `COPY_TO_HARMONY_APP` in the full-replacement ZIP. Use `INSTALL_STAGE7.ps1` from the extracted ZIP in preview mode first. Source root must preserve `.env.local` and `.git`. Replace route-bearing directories as units, not by merging old and new routes.

Validation commands are declared in `package.json`: `npm ci`, `npm run test:stage7`, `npm run test:lifecycle`, `npm run test:smoke`, `npm run test:ui`, `npm run test:balance`, `npm run test:ptkp`, `npm run test:theme-normalization`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

Stage 7 contains no production database write migration. Use `SQL_ONLY/09_STAGE7_LIFECYCLE_AUTOMATION_DIAGNOSTIC_READ_ONLY.sql` only for read-only production diagnosis, and **never** rerun deprecated SQL 02 after Stage 6.
