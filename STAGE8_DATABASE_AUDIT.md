# HARMONY Stage 8 — Database Evidence Audit (REVIEW)

**Sumber:** `database.zip` dari pengguna, berisi ekspor tabel dan snapshot metadata Supabase bertanggal **2026-10-29 01:39:59 UTC**. Sumber ini hanya dipakai untuk pemeriksaan; **tidak ikut dikemas**, karena memuat data karyawan dan operasional yang bersifat pribadi. Angka berikut berasal dari ekspor tersebut, **bukan pemeriksaan live**.

## Ringkasan bukti, akar masalah, dan tindakan

| Prioritas | Temuan / bukti | Akar masalah / implikasi | Tindakan Stage 8 | Status |
|---|---|---|---|---|
| P0 | `harmony_reconcile_leave_lifecycle_one` adalah `SECURITY DEFINER`, menjalankan perubahan saldo dan siklus tanpa memeriksa `auth.uid()` di tubuhnya. Snapshot tidak memuat grants aktual. | Jika `EXECUTE` masih dibuka untuk `anon`/`authenticated`, RPC worker dapat dipanggil langsung. | Query privilege read-only di SQL 12, migrasi opsional dengan revocation di SQL 13; jangan aktifkan cron sebelum status hak akses diverifikasi. | **Perlu hasil live**; migrasi tidak dijalankan. |
| P0 | Storage `leave-attachments` dan `phl-proofs` bertanda publik; policy `storage.objects` memberi `SELECT`/`INSERT` ke role `public` pada dua bucket itu dan `attendance-uploads`. | Akses lampiran/pengunggahan berisiko terlalu luas; beberapa modul masih menggunakan URL publik, sehingga memprivatkan langsung akan memutus akses. | SQL 12 memetakan policy/bucket. Rencana perbaikan terpisah: unggah bertanda tangan dengan pemeriksaan pemilik, ganti semua `getPublicUrl`, migrasikan tautan, lalu kunci policy. | **P0 terbuka**; jangan mengubah bucket langsung. |
| P1 | Ada fungsi `harmony_ensure_annual_leave_cycles` dan `harmony_reconcile_leave_lifecycle_one`; tidak ada cron cuti di `vercel.json`; snapshot tidak mencantumkan `pg_cron`. | Pematangan dapat dibuat saat RPC dipanggil tetapi pemanggilan terjadwal independen dari login belum ditemukan. | Endpoint cron Vercel baru menggunakan RPC yang sama, WITA, locking DB existing, kapasitas terkontrol, fail-closed maintenance; `HARMONY_LEAVE_CRON_ENABLED` **off** secara default. | Kode dibuat dan tes source dijalankan; integrasi live belum diuji. |
| P1 | Kolom `employees.join_date`, `annual_leave_cycles.matured_at/cycle_start/cycle_end` bertipe `text`. | Kesalahan format tanggal akan mengganggu cast `::date`; ekspor saat ini dapat diparse untuk semua baris. | Tidak memigrasikan tipe kolom produksi secara otomatis. Ditandai untuk migration desain bertahap. | Risiko schema dicatat. |
| P1 | `harmony_ensure_annual_leave_cycles` memberikan `entitlement_days=12` dan mengunci baris karyawan lalu memeriksa siklus yang sudah ada. | Kebijakan 12 hari ditemukan dalam **implementasi produksi**, tetapi tidak diverifikasi sebagai dokumen kebijakan HR. | Reuse RPC; cron tidak menghitung jatah baru di frontend, tidak menjalankan backfill massal via SQL. | Bukti ada; kebijakan belum dikonfirmasi secara independen. |
| P1 | Dua trigger `trg_harmony_attendance_phl_credit` dan `trg_harmony_period_phl_credit` memiliki `enabled_flag=D`. | Pemberian saldo PHL otomatis via kedua trigger itu nonaktif; kemungkinan disengaja agar tidak menduplikasi mekanisme approval yang lain. | Tidak mengaktifkan trigger. Menetapkan audit konsistensi proses sebagai tindak lanjut. | Belum diverifikasi proses end-to-end produksi. |
| P1 | Ada 48 karyawan, 202 siklus, 48 adjustment; 7 karyawan tanpa siklus, tetapi **0** karyawan dengan masa kerja setidaknya setahun yang tidak mempunyai siklus matang pada tanggal snapshot. | Pernyataan "semua cuti belum matang" tidak didukung data snapshot; masalah mungkin hanya berlangsung pada tanggal anniversary berikutnya tanpa scheduler. | Jadwal baru memproses tiap hari dan menangkap job yang terlewat menggunakan pembentukan siklus historis existing. | Snapshot diperiksa; run live belum diuji. |
| P1 | Saldo legacy dan `harmony_leave_balance_summary` sama untuk 48 baris ekspor. | Tidak terdapat bukti untuk penyesuaian saldo massal. | Tidak melakukan UPDATE terhadap saldo atau 48 baris adjustment. | Cross-check snapshot selesai. |
| P1 | 167 `phl_records`, 102 `phl_work_requests`; 5 catatan PHL approved telah kedaluwarsa dan masih memiliki sisa fisik. | Bukan otomatis bug: view saldo efektif mengecualikan PHL kedaluwarsa. | Tidak melakukan penghapusan saldo historis. | Tinjauan saldo efektif perlu tes produksi. |
| P1 | 330 job queue: 329 `completed`, 1 `failed`. Outbox: 45 `sent`, 0 pending. | Ada satu error historis yang tidak dapat didiagnosis tanpa pemeriksaan error tersanitasi. | Tidak mengirim ulang job secara massal. | Review manual job gagal diperlukan. |
| P1 | 48 karyawan aktif, 49 `app_users` dengan 2 entri tanpa employee link; **1 karyawan** tidak mempunyai relasi ke `app_users`. | Bisa menjadi faktor bug akun login, tetapi file CSV tidak memuat `auth.users`, sehingga akun Auth tidak dapat dipastikan. | Rekomendasi rekonsiliasi via HR dengan pencocokan `Auth UUID` yang sah; tidak membuat akun otomatis dari dump. | Verifikasi Auth live diperlukan. |
| P2 | 193 siklus status `active`, 9 `carried_forward`; hanya 41 siklus mencakup tanggal 29 Okt 2026. | Label status historis tidak sama dengan status berlaku hari ini; perlu merujuk rentang tanggal pada view. | Tetap memakai view lifecycle sebagai sumber tampilan, tidak mengubah data historis. | Terbukti dari snapshot. |

## Risiko / pengaman endpoint terjadwal

- Cron terdaftar di `vercel.json` pada **16:10 UTC**, setara **00:10 WITA** hari berikutnya. Vercel menjalankan cron dalam UTC; jadwal produksi belum diverifikasi di dashboard.
- Endpoint menggunakan `CRON_SECRET` yang sudah ada, membatasi pelaksanaan hanya jika `HARMONY_LEAVE_CRON_ENABLED=true` diberikan secara **eksplisit**, tidak menerima perintah dari pengguna biasa.
- Berhenti saat maintenance aktif, atau status maintenance tidak dapat diperiksa. Pemrosesan yang terlewat dilanjutkan pada pemanggilan berikutnya lewat RPC existing yang memeriksa maturity historis.
- Per batch maksimal 4 karyawan, maksimal 200 karyawan total. Jika lebih dari kapasitas, gagal dengan status eksplisit, tidak diam-diam membuang sebagian daftar.
- RPC yang dipakai mengunci karyawan (`FOR UPDATE` dan advisory transaction lock), memeriksa keberadaan siklus, dan memakai event audit dengan index unik. Cron tidak mengimplementasikan rumus hak cuti sendiri.
- Batas waktu eksekusi di serverless dapat menyebabkan pemrosesan parsial. Respons mengembalikan `remaining` dan `failed`, bukan menyatakan berhasil. Tidak ada nama, email, atau UUID karyawan dalam respons/log.
- **Ini belum membuktikan** seluruh kegagalan/retry otomatis akan selalu terselesaikan dalam satu hari, terutama jika jumlah karyawan meningkat atau fungsi database gagal permanen.

## Langkah wajib sebelum aktivasi

1. Jalankan query SQL 12 **per blok** di Supabase yang benar. Pastikan hasil eksekusi `anon_can_execute=false` dan `authenticated_can_execute=false` untuk `harmony_reconcile_leave_lifecycle_one`, sementara `service_role_can_execute=true`. Jika belum, audit semua pengguna RPC dan tinjau migrasi **opsional** SQL 13.
2. Uji endpoint di **staging** dengan Auth Service Role **staging**, CRON_SECRET staging, dan `HARMONY_LEAVE_CRON_ENABLED=true` hanya setelah backup staging. Pastikan tidak ada kredit ganda pada pemanggilan berulang.
3. Pastikan `harmony_system_controls` terbaca dan `system_enabled` sesuai tujuan. Konfirmasikan audit WITA, join_date, 12 hari sebagai aturan yang berlaku, dan status siklus setelah pemanggilan.
4. Baru setelah verifikasi dan izin operasional, set environment variable `HARMONY_LEAVE_CRON_ENABLED=true` di **Vercel Production** (bukan di source atau Git). Redeploy, lalu pantau Vercel Cron Jobs dan audit 14 hari pada SQL 12.
5. Rollback cepat: ubah env menjadi `false` dan redeploy, atau revert commit; jadwal email lama tidak dihapus. Jika ada data tak sesuai, jangan lakukan perubahan saldo langsung; gunakan audit dan transaksi koreksi yang diotorisasi.

## Validasi yang tersedia

- Parser TypeScript, guard source, smoke route, WITA boundary, dan tes lifecycle adalah pengujian **lokal/statis**. Tidak boleh disamakan dengan integrasi Supabase production.
- Perubahan tidak memasukkan satu pun ekspor tabel, secret, informasi profil, file bukti, atau user ID dalam paket.
