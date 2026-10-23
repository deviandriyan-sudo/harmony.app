'use client'

import type { RemedClaim, RemedProcessHistory } from '@/types/remed'
import { downloadStyledWorkbook } from '@/lib/export/styled-workbook'

function fileStamp() { return new Date().toISOString().slice(0, 10) }
function safeStatus(value: string | null | undefined) { return value ? value.replaceAll('_', ' ') : '-' }

export function downloadRemedClaimsXlsx(claims: RemedClaim[], context: string) {
  const totalSubmitted = claims.reduce((sum, item) => sum + Number(item.submitted_amount || 0), 0)
  const totalReceipts = claims.reduce((sum, item) => sum + Number(item.receipt_amount ?? item.submitted_amount ?? 0), 0)
  const totalApproved = claims.reduce((sum, item) => sum + Number(item.approved_amount || 0), 0)
  const rows = claims.map((item, index) => ({
    No: index + 1,
    'Nomor Klaim': item.claim_number,
    'NIP': item.employee?.employee_number || '',
    'Nama Karyawan': item.employee?.full_name || '',
    Unit: item.employee?.department || '',
    'Jenis Klaim': item.claim_type?.name || '',
    'Tanggal Perawatan': item.treatment_date || '',
    'Provider / Rumah Sakit': item.provider_name || '',
    'Nilai Kuitansi Asli': Number(item.receipt_amount ?? item.submitted_amount ?? 0),
    'Nominal Diproses (Batas Plafond)': Number(item.submitted_amount || 0),
    'Selisih Di Luar Plafond': Math.max(0, Number(item.receipt_amount ?? item.submitted_amount ?? 0) - Number(item.submitted_amount || 0)),
    'Nominal Disetujui': item.approved_amount == null ? '' : Number(item.approved_amount),
    'Status Klaim': safeStatus(item.status),
    'Status HR': item.hr_reviewed_at ? 'Disetujui / Ditinjau' : 'Belum',
    'Review HR At': item.hr_reviewed_at || '',
    'Catatan HR': item.hr_note || '',
    'Status Finance': item.finance_reviewed_at ? 'Ditinjau' : 'Belum',
    'Review Finance At': item.finance_reviewed_at || '',
    'Catatan Finance': item.finance_note || '',
    'Tanggal Bayar': item.payment_date || '',
    'Referensi Pembayaran': item.payment_reference || '',
    'Bank': item.bank_name || '',
    'Nomor Rekening (4 terakhir)': item.bank_account_number ? `••••${item.bank_account_number.slice(-4)}` : '',
    'Nama Rekening': item.bank_account_name || '',
    'Memengaruhi Plafond': item.affects_entitlement ? 'YA' : 'TIDAK',
    'Plafond Tahunan': item.entitlement?.plafond_total ?? '',
    'Sisa Plafond': item.entitlement?.available_amount ?? '',
    'Jumlah Bukti': item.attachments?.length ?? 0,
    'Dibuat Pada': item.created_at || '',
    'Diperbarui Pada': item.updated_at || '',
  }))
  downloadStyledWorkbook(`HARMONY_REMED_${context}_${fileStamp()}.xlsx`, [
    { name: 'Ringkasan', rows: [
      { Komponen: 'Jenis Laporan', Nilai: context },
      { Komponen: 'Tanggal Export', Nilai: fileStamp() },
      { Komponen: 'Total Klaim', Nilai: claims.length },
      { Komponen: 'Menunggu HR', Nilai: claims.filter((item) => item.status === 'pending_hr').length },
      { Komponen: 'Menunggu Finance', Nilai: claims.filter((item) => item.status === 'pending_finance').length },
      { Komponen: 'Menunggu Pembayaran', Nilai: claims.filter((item) => item.status === 'waiting_payment').length },
      { Komponen: 'Dibayar', Nilai: claims.filter((item) => item.status === 'paid').length },
      { Komponen: 'Total Kuitansi Asli', Nilai: totalReceipts },
      { Komponen: 'Total Diproses', Nilai: totalSubmitted },
      { Komponen: 'Total Disetujui', Nilai: totalApproved },
    ] },
    { name: 'Daftar Klaim', rows },
    { name: 'Panduan Status', rows: [
      { Status: 'Paid / Approved', Keterangan: 'Hijau' },
      { Status: 'Pending / Waiting Payment', Keterangan: 'Amber' },
      { Status: 'Rejected / Cancelled', Keterangan: 'Merah' },
      { Status: 'Pemeriksaan HR / Finance', Keterangan: 'Data review dipisahkan' },
      { Status: 'Nomor Rekening', Keterangan: 'Hanya 4 digit terakhir untuk keamanan data' },
    ] },
  ])
}

export function downloadRemedHistoryXlsx(history: RemedProcessHistory[], context: string) {
  const rows = history.map((item, index) => ({
    No: index + 1,
    'Nomor Klaim': item.claim_number,
    'Nama Karyawan': item.employee_name || '',
    'Jenis Klaim': item.claim_type_name || '',
    'Tanggal Perawatan': item.treatment_date || '',
    'Nominal Diajukan': Number(item.submitted_amount || 0),
    'Nominal Disetujui': item.approved_amount == null ? '' : Number(item.approved_amount),
    'Status Sebelum': safeStatus(item.from_status),
    'Status Sesudah': safeStatus(item.to_status),
    'Status Saat Ini': safeStatus(item.current_status),
    'Aktor': item.actor_role || '',
    'Email Aktor': item.actor_email || '',
    'Alasan / Catatan': item.note || '',
    'Waktu Kejadian': item.event_at,
    'Riwayat Dihapus': item.is_deleted ? 'YA' : 'TIDAK',
  }))
  downloadStyledWorkbook(`HARMONY_REMED_RIWAYAT_${context}_${fileStamp()}.xlsx`, [
    { name: 'Ringkasan', rows: [
      { Komponen: 'Bagian', Nilai: context },
      { Komponen: 'Jumlah Peristiwa', Nilai: rows.length },
      { Komponen: 'Ditolak', Nilai: history.filter((item) => item.to_status.includes('rejected')).length },
      { Komponen: 'Pembayaran Selesai', Nilai: history.filter((item) => item.to_status === 'paid').length },
    ] },
    { name: 'Riwayat Approval', rows },
  ])
}
