HARMONY HR REQUEST CONTROL V2.1 — UNIFIED APPROVAL DASHBOARD
Date: 2026-10-02

PURPOSE
- Remove tab-switch workflow on HR > Cuti, Izin & PHL.
- Combine outstanding Cuti/Izin + PHL claims into one approval queue.
- Keep balance, audit, and history on the same page as collapsible panels.
- Preserve existing approval, rejection, delete, PHL FIFO, reversal, balance, database, and notification logic.

CHANGED SOURCE
- app/hr/leave/page.tsx

BEHAVIOR CHANGES
1. Removed navigation tabs:
   - Pengajuan Cuti & Izin
   - Saldo Cuti
   - Approval Klaim PHL
   - Saldo PHL
   - Audit PHL
   - Riwayat
2. Added "Monitoring Terpadu" toolbar.
3. Added one "Outstanding Persetujuan" queue combining Cuti/Izin and PHL.
4. Queue clearly labels request category and keeps canonical HR actions.
5. Saldo Cuti, Saldo PHL, Audit PHL, and Riwayat remain in the same page as expandable sections.
6. Global search filters the unified queue and supporting panels.
7. Administrasi Saldo & Jenis remains a dedicated administration route.

DATABASE
- No SQL migration required.
- No database table / RPC / policy changes.
- Compact V2 database structure is preserved.

REGRESSION SCOPE
- Attendance: unchanged.
- Leave workflow: business logic unchanged.
- PHL FIFO / reversal: unchanged.
- Re-Med: unchanged.
- Authentication / roles: unchanged.
- Outsource: remains HOLD.

STATIC VALIDATION
- Routes scanned: 81 (54 page + 27 API)
- Exact route conflicts: 0
- Normalized/dynamic conflicts: 0
- Optional catch-all conflicts: 0
- Missing local imports: 0
- TS/TSX files parsed: 128
- Syntax errors: 0

BUILD STATUS
- Full npm run build was not completed in the packaging environment because dependency installation did not complete.
- Run npm run build locally before commit/push/deploy.
