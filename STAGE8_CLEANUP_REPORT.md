# HARMONY Stage 8 — Cleanup & Retention

- **Dipertahankan:** seluruh 64 halaman, 48 API dari Stage 7, modul, aset, dependency/lockfile, konfigurasi deployment, semua SQL historis 01–11, scripts regression existing, dokumentasi operasional Stage 7.
- **Ditambah:** satu API cron lifecycle (total 49), satu jadwal Vercel, tes cron & tanggal WITA, SQL 12 diagnostik read-only, SQL 13 migrasi hak akses **opsional tidak otomatis**, laporan Stage 8 dan panduan aktivasi.
- **Diarsipkan:** `STAGE7_SHA256_MANIFEST.txt` dipindah ke `docs/archive/` karena hash Stage 7 bukan manifest Stage 8. `STAGE8_SHA256_MANIFEST.txt` baru dibuat dari source Stage 8.
- **Dikeluarkan dari ZIP:** ekspor `database.zip`, CSV pribadi, metadata snapshot mentah, `node_modules`, `.env.local`, `.git`, `.next`, cache dan file hasil build. Tidak ada baris database yang dihapus atau diubah.
- **Installer:** dry-run secara default; `-Apply` memindahkan direktori lama ke folder backup bertimestamp, baru mengganti isi `app/components/lib/public/scripts/types`; melindungi `.env.local` dan `.git`, mempertahankan riwayat SQL.
- **Keputusan tidak dilakukan:** tidak mengubah struktur date text, tidak mengaktifkan trigger PHL yang dinonaktifkan, tidak mengubah policy bucket Storage secara langsung, tidak memigrasikan saldo atau akun.
