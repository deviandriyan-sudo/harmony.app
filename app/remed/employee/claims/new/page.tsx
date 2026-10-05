'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus2, Loader2, Paperclip, Send, X } from 'lucide-react'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaimType } from '@/types/remed'

export default function NewRemedClaimPage() {
  const router = useRouter()
  const [types, setTypes] = useState<RemedClaimType[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    remedFetch<{ claimTypes: RemedClaimType[] }>('/api/remed/claim-types')
      .then((payload) => setTypes(payload.claimTypes || []))
      .catch((error) => setMessage(error?.message || 'Gagal memuat jenis klaim.'))
  }, [])

  function onFiles(input: FileList | null) {
    setFiles((current) => [...current, ...(input ? Array.from(input) : [])].slice(0, 3))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (files.length < 1) {
      setMessage('Minimal 1 bukti kuitansi wajib diunggah.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData(event.currentTarget)
      files.forEach((file) => formData.append('receipts', file))
      const result = await remedFetch<{ claimId: string; claimNumber: string }>('/api/remed/claims', { method: 'POST', body: formData })
      window.alert(`Klaim ${result.claimNumber} berhasil diajukan.`)
      router.push('/remed/employee/claims')
    } catch (error: any) {
      setMessage(error?.message || 'Gagal mengajukan reimbursement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader
        eyebrow="Re-Med · Employee"
        title="Ajukan Reimbursement"
        description="Isi data pengobatan, rekening pembayaran, dan lampirkan minimal 1 bukti. Maksimal 3 file PDF/JPG/PNG/WEBP, 10 MB per file."
        icon={FilePlus2}
      />

      <form onSubmit={submit} className="harmony-unified-surface space-y-6 p-5 sm:p-7">
        {message ? <div className="rounded-[18px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{message}</div> : null}

        <div>
          <h2 className="harmony-section-title">Data Reimbursement</h2>
          <p className="harmony-section-copy">Informasi utama klaim medical reimbursement.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="harmony-label">Jenis Klaim</span>
              <select name="claim_type_id" required defaultValue="" className="harmony-select">
                <option value="" disabled>Pilih jenis klaim</option>
                {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="harmony-label">Tanggal Pengobatan</span>
              <input name="treatment_date" type="date" required className="harmony-input" />
            </label>
            <label className="block">
              <span className="harmony-label">Provider / Rumah Sakit / Toko</span>
              <input name="provider_name" className="harmony-input" placeholder="Opsional" />
            </label>
            <label className="block">
              <span className="harmony-label">Nominal</span>
              <input name="submitted_amount" type="number" min="1" step="1" required className="harmony-input" placeholder="250000" />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="harmony-label">Catatan</span>
            <textarea name="employee_note" rows={3} className="harmony-textarea" placeholder="Keterangan singkat reimbursement" />
          </label>
        </div>

        <div className="harmony-subtle-panel p-5">
          <h2 className="harmony-section-title">Rekening Pembayaran</h2>
          <p className="harmony-section-copy">Pastikan rekening aktif dan nama pemilik sesuai.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input name="bank_name" required className="harmony-input" placeholder="Nama bank" />
            <input name="bank_account_number" required className="harmony-input" placeholder="Nomor rekening" />
            <input name="bank_account_name" required className="harmony-input" placeholder="Nama pemilik rekening" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="harmony-section-title">Bukti Kuitansi</h2>
              <p className="harmony-section-copy">Minimal 1 file dan maksimal 3 file.</p>
            </div>
            <span className="rounded-full bg-[#eef0f3] px-3 py-1 text-xs font-bold text-[#646971]">{files.length}/3</span>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-[20px] border border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50">
            <Paperclip size={18} /> Pilih File
            <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { onFiles(event.target.files); event.currentTarget.value = '' }} disabled={files.length >= 3} />
          </label>

          {files.length ? (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-[16px] border border-black/[0.055] bg-[#f8f9fb] px-4 py-3 text-sm">
                  <span className="truncate pr-3">{file.name}</span>
                  <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex h-8 w-8 items-center justify-center rounded-[11px] text-red-500 transition hover:bg-red-50"><X size={17} /></button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <button disabled={loading} type="submit" className="harmony-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 disabled:opacity-60">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {loading ? 'Mengirim...' : 'Ajukan Reimbursement'}
        </button>
      </form>
    </section>
  )
}
