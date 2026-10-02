$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "HARMONY Re-Med - Import tanda tangan awal ke private Supabase Storage" -ForegroundColor Cyan
Write-Host "File seed lokal berada di _setup\_private_signature_seed dan di-ignore oleh Git." -ForegroundColor DarkGray

node .\_setup\seed-remed-signatures.mjs

if ($LASTEXITCODE -ne 0) {
    throw "Import tanda tangan gagal. Jangan deploy sebelum error diselesaikan."
}

Write-Host "Import selesai." -ForegroundColor Green
