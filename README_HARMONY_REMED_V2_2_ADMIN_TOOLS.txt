HARMONY + RE-MED V2.2 — ADMIN TOOLS

FEATURES
1. HR Dashboard: Print Form + Hapus pada Klaim Terbaru.
2. Finance Dashboard: Print Form + Hapus pada Klaim Terbaru.
3. Print Form membuka form permohonan pembayaran per klaim.
4. Hapus memakai RPC transactional dan mengoreksi entitlement sesuai status:
   - pending_hr: release submitted reserve
   - pending_finance / waiting_payment: release approved reserve
   - paid: reverse current_used
   - rejected / cancelled / legacy: tidak double reversal
5. Jejak klaim yang dihapus tetap tersimpan pada harmony_audit.remed_audit_logs.
6. Riwayat status lama juga diarsipkan sebelum hard delete.
7. HR dan Finance memiliki satu menu Riwayat Proses berisi approve, reject, alasan, pembayaran, pembatalan, dan penghapusan.

INSTALL ORDER
A. Supabase: run _setup/HARMONY_REMED_V2_2_ADMIN_TOOLS_PRECHECK.sql (optional/read-only)
B. Supabase: run _setup/HARMONY_REMED_V2_2_ADMIN_TOOLS_MIGRATION.sql
C. Supabase: run _setup/HARMONY_REMED_V2_2_ADMIN_TOOLS_POSTCHECK.sql
D. Copy all COPY_TO_HARMONY_APP contents to D:\WEBSITE\harmony.app and Replace/Overwrite.
E. Do not replace .env.local, .git, or node_modules.
F. Run npm run build.
G. Only if build passes: git add/commit/push.

NO CHANGES
- Attendance flow
- Leave flow
- PHL FIFO / balance logic
- Re-Med claim submit / HR approval / Finance approval / payment flow
- Compact V2 schema organization
- Outsource remains HOLD
