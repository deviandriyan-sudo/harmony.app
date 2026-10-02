HARMONY + RE-MED V2.4 - DELETED CLAIM HISTORY CLEANUP

TUJUAN
- Tambah tombol Hapus Riwayat pada HR > Re-Med > Riwayat Proses.
- Tombol hanya tampil pada tombstone/status Dihapus.
- Sekali hapus akan membersihkan seluruh archived approval/reject/history untuk claim yang sama.
- Finance tetap read-only.
- Klaim aktif wajib dihapus dari Dashboard lebih dahulu.
- Tidak melakukan reversal saldo/plafond kedua kali.

DATABASE ORDER
1. _setup/HARMONY_REMED_V2_4_HISTORY_CLEANUP_PRECHECK.sql
2. _setup/HARMONY_REMED_V2_4_HISTORY_CLEANUP_MIGRATION.sql
3. _setup/HARMONY_REMED_V2_4_HISTORY_CLEANUP_POSTCHECK.sql

SOURCE
Copy seluruh isi COPY_TO_HARMONY_APP ke D:\\WEBSITE\\harmony.app lalu Replace/Overwrite.

BUILD
npm run build

Jika build gagal: STOP. Jangan commit/push.
