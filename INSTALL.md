# HARMONY — Stage 10 (source compact)

Gunakan installer `INSTALL_STAGE10.ps1` di root paket ZIP (di luar APP_SOURCE) untuk preview, backup, dan replace aman.
File `.env.local` dan `.git` harus tetap berada di folder proyek lama. Jangan menyalin `node_modules`, `.next`, atau dump database.

Validasi wajib sebelum deploy: `npm ci`, `npm run test:stage10`, `npm run test:stage9`, `npm run test:stage9:dashboard`, `npm run test:stage8`, `npm run test:smoke`, `npm run test:theme`, `npm run test:balance`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit`.

Migrasi SQL di `SQL_ONLY` adalah arsip operasional; **tidak dijalankan otomatis**. SQL 02 merupakan implementasi legacy dan tidak boleh diterapkan ulang setelah Stage 6. Pembatasan izin RPC Stage 8 sebelumnya telah dilaporkan diterapkan di produksi, tetapi status itu tidak dapat diverifikasi dari ZIP ini. Cron hanya dijalankan sesuai env produksi dan kondisi maintenance.
