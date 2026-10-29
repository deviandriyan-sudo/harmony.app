# Stage 7 source cleanup inventory

- **Runtime** kept: all `app/`, `components/`, `lib/`, `types/`, `public/` and Next.js server/API handlers; 64 pages and 48 API files.
- **Build/dependency** kept: `package.json`, `package-lock.json` (same dependency resolutions as uploaded baseline), `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vercel.json`, `next-env.d.ts`, component configs.
- **Testing/maintenance** kept: all scripts in `scripts/`, including prior Stage 3/5/6 guards and new Stage 7 guards. Some are historical regression tests but still runnable.
- **Migrations/operations** kept: every original `SQL_ONLY/*.sql`, including deprecated 02 with its DO-NOT-RERUN header. Added read-only diagnostic 09, verification 10 and migration-status document 11. No production SQL changes included.
- **Active docs** kept/updated: `README.md`, `INSTALL.md`, `DESIGN_SYSTEM.md`, `DESIGN_TOKENS_STAGE7.md`, `STAGE7_AUDIT_REPORT.md`, `STAGE7_CLEANUP_REPORT.md`.
- **Archived without deleting**: `CHANGED_FILES.md`, `HARMONY_DESIGN_SYSTEM_V384.md`, `INSTALL_STAGE5.md`, `INSTALL_STAGE6.md`, `STAGE5_AUDIT_AND_LIMITATIONS.md`, `STAGE5_CHANGED_FILES.csv`, `STAGE5_SHA256_MANIFEST.txt`, `STAGE6_AUDIT_REPORT.md`, `STAGE6_CHANGED_FILES.csv`, `STAGE6_SHA256_MANIFEST.txt`, `THEME_AUDIT_REPORT.md`, `VALIDATION_REPORT.md`, `HARMONY_6_PART_PROJECT_BRIEF.md` moved to `docs/archive/` (historical hashes are not current manifest).
- **Removed generated files from package**: `tsconfig.tsbuildinfo` (regenerable compiler cache). Excluded partial `node_modules`, `.next`, local environment and all secrets. None of the active source/routes were deleted.
- **Stale route protection**: `INSTALL_STAGE7.ps1` dry-run then replacement moves old `app`, `components`, `lib`, `public`, `scripts`, `types` out of target before copying new directories. The script does not remove any SQL history, `.env.local`, `.git`, or `node_modules`.
- **Do not automatically remove unreferenced code** just because import searches are empty; some pages are routed or invoked dynamically. Route aliases (`/hr/leave/cycles` etc.) retained for compatibility.
