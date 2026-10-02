'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ClaimStatusBadge } from '@/components/remed/ClaimStatusBadge'
import { formatRemedDate, formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

export function PaymentRequestPrint({ claimId }: { claimId: string }) {
  const router = useRouter()
  const [claim, setClaim] = useState<RemedClaim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    remedFetch<{ claim: RemedClaim }>(`/api/remed/claims/${claimId}`)
      .then((payload) => setClaim(payload.claim))
      .catch((issue: any) => setError(issue?.message || 'Gagal memuat form pembayaran.'))
      .finally(() => setLoading(false))
  }, [claimId])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-[#18794e]" /></div>
  }

  if (!claim) {
    return <div className="mx-auto max-w-3xl p-8 text-center text-sm text-red-700">{error || 'Klaim tidak ditemukan.'}</div>
  }

  const approvedAmount = claim.approved_amount ?? (claim.status === 'legacy_record' ? claim.submitted_amount : null)

  return (
    <section className="mx-auto max-w-[1000px] p-4 sm:p-6 lg:p-8 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm">
          <ArrowLeft size={16} /> Kembali
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#1d1d1f] px-4 py-2 text-sm font-semibold text-white shadow-sm">
          <Printer size={16} /> Print Form Pembayaran
        </button>
      </div>

      <article className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-9 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-5 border-b-2 border-[#1d1d1f] pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-black/10">
              <Image src="/logo.png" alt="Logo Poltek Simas Berau" width={56} height={56} className="h-14 w-14 object-contain" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6e6e73]">HARMONY · RE-MED</p>
              <h1 className="mt-1 text-2xl font-bold text-[#1d1d1f]">FORM PERMOHONAN PEMBAYARAN</h1>
              <p className="mt-1 text-sm text-[#6e6e73]">Medical Reimbursement</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#6e6e73]">Nomor Klaim</p>
            <p className="mt-1 font-mono text-sm font-bold">{claim.claim_number}</p>
            <div className="mt-2 inline-flex"><ClaimStatusBadge status={claim.status} /></div>
          </div>
        </header>

        <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="Nama Karyawan" value={claim.employee?.full_name || '-'} />
          <Field label="NIK" value={claim.employee?.employee_number || '-'} />
          <Field label="Unit / Departemen" value={claim.employee?.department || '-'} />
          <Field label="Jabatan" value={claim.employee?.position || '-'} />
          <Field label="Jenis Reimbursement" value={claim.claim_type?.name || '-'} />
          <Field label="Tanggal Pengobatan" value={formatRemedDate(claim.treatment_date)} />
          <Field label="Provider" value={claim.provider_name || '-'} />
          <Field label="Tanggal Pengajuan" value={formatRemedDate(claim.created_at)} />
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-[#f8f8fa] p-5 print:bg-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e6e73]">Nilai Pembayaran</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Field label="Nominal Diajukan" value={formatRupiah(claim.submitted_amount)} strong />
            <Field label="Nominal Disetujui" value={approvedAmount ? formatRupiah(approvedAmount) : '-'} strong />
            <Field label="Status" value={claim.status.replaceAll('_', ' ')} strong />
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/10 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e6e73]">Rekening Pembayaran</p>
            <div className="mt-4 space-y-3">
              <Field label="Bank" value={claim.bank_name || '-'} />
              <Field label="Nomor Rekening" value={claim.bank_account_number || '-'} />
              <Field label="Nama Pemilik Rekening" value={claim.bank_account_name || '-'} />
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e6e73]">Catatan</p>
            <div className="mt-4 space-y-3">
              <Field label="Karyawan" value={claim.employee_note || '-'} />
              <Field label="HR" value={claim.hr_note || '-'} />
              <Field label="Finance" value={claim.finance_note || '-'} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <ApprovalBox title="Diajukan Oleh" name={claim.employee?.full_name || 'Karyawan'} date={formatRemedDate(claim.created_at)} />
          <ApprovalBox title="Diperiksa HR" name={claim.hr_reviewed_at ? 'HR Re-Med' : '-'} date={formatRemedDate(claim.hr_reviewed_at)} />
          <ApprovalBox title="Diproses Finance" name={claim.finance_reviewed_at ? 'Finance Re-Med' : '-'} date={formatRemedDate(claim.finance_reviewed_at || claim.payment_date)} />
        </div>

        {(claim.payment_date || claim.payment_reference) && (
          <div className="mt-6 border-t border-black/10 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e6e73]">Informasi Pembayaran</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal Pembayaran" value={formatRemedDate(claim.payment_date)} />
              <Field label="Referensi Pembayaran" value={claim.payment_reference || '-'} />
            </div>
          </div>
        )}

        <footer className="mt-8 border-t border-black/10 pt-4 text-[11px] leading-5 text-[#6e6e73]">
          Form ini dihasilkan otomatis oleh HARMONY Re-Med. Pastikan data rekening dan nominal pembayaran telah diverifikasi sebelum proses transfer.
        </footer>
      </article>
    </section>
  )
}

function Field({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">{label}</p>
      <p className={['mt-1 break-words text-sm text-[#1d1d1f]', strong ? 'font-bold' : 'font-medium'].join(' ')}>{value}</p>
    </div>
  )
}

function ApprovalBox({ title, name, date }: { title: string; name: string; date: string }) {
  return (
    <div className="min-h-[150px] rounded-2xl border border-black/10 p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">{title}</p>
      <div className="h-16" />
      <p className="border-t border-black/30 pt-2 text-sm font-semibold text-[#1d1d1f]">{name}</p>
      <p className="mt-1 text-xs text-[#6e6e73]">{date}</p>
    </div>
  )
}
