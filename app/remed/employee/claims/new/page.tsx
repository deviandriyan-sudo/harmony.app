'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Paperclip, Send, X } from 'lucide-react'
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
      .then((x) => setTypes(x.claimTypes))
      .catch((e) => setMessage(e.message))
  }, [])

  function onFiles(input: FileList | null) {
    const next = [...files, ...(input ? Array.from(input) : [])].slice(0, 3)
    setFiles(next)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (files.length < 1) { setMessage('Minimal 1 bukti kuitansi wajib diunggah.'); return }
    setLoading(true)
    try {
      const fd = new FormData(event.currentTarget)
      files.forEach((file) => fd.append('receipts', file))
      const result = await remedFetch<{ claimId: string; claimNumber: string }>('/api/remed/claims', { method: 'POST', body: fd })
      window.alert(`Klaim ${result.claimNumber} berhasil diajukan.`)
      router.push('/remed/employee/claims')
    } catch (error: any) {
      setMessage(error?.message || 'Gagal mengajukan reimbursement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#18794e]">Re-Med Employee</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Ajukan Reimbursement</h1><p className="mt-2 text-sm text-[#6e6e73]">Minimal 1 bukti, maksimal 3 file. Format PDF/JPG/PNG/WEBP, maksimal 10 MB per file.</p></div>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-7">
        {message ? <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{message}</div> : null}
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block"><span className="text-sm font-semibold">Jenis Klaim</span><select name="claim_type_id" required defaultValue="" className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3 text-sm outline-none"><option value="" disabled>Pilih jenis klaim</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          <label className="block"><span className="text-sm font-semibold">Tanggal Pengobatan</span><input name="treatment_date" type="date" required className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3 text-sm outline-none" /></label>
          <label className="block"><span className="text-sm font-semibold">Provider / Rumah Sakit / Toko</span><input name="provider_name" className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3 text-sm outline-none" placeholder="Opsional" /></label>
          <label className="block"><span className="text-sm font-semibold">Nominal</span><input name="submitted_amount" type="number" min="1" step="1" required className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3 text-sm outline-none" placeholder="250000" /></label>
        </div>
        <label className="block"><span className="text-sm font-semibold">Catatan</span><textarea name="employee_note" rows={3} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3 text-sm outline-none" placeholder="Keterangan singkat reimbursement" /></label>

        <div className="rounded-[24px] bg-[#f5f7f6] p-4">
          <p className="text-sm font-semibold">Rekening Pembayaran</p>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <input name="bank_name" required className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Nama bank" />
            <input name="bank_account_number" required className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Nomor rekening" />
            <input name="bank_account_name" required className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Nama pemilik rekening" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between"><span className="text-sm font-semibold">Bukti Kuitansi</span><span className="text-xs text-[#6e6e73]">{files.length}/3 file</span></div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-[22px] border border-dashed border-[#18794e]/30 bg-emerald-50/40 p-5 text-sm font-semibold text-[#18794e]"><Paperclip size={18} /> Pilih File<input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = '' }} disabled={files.length >= 3} /></label>
          {files.length ? <div className="mt-3 space-y-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm"><span className="truncate pr-3">{file.name}</span><button type="button" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))} className="text-red-500"><X size={17} /></button></div>)}</div> : null}
        </div>

        <button disabled={loading} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#18794e] px-5 py-3.5 text-sm font-bold text-white shadow-[0_15px_35px_rgba(24,121,78,0.2)] disabled:opacity-60">{loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}{loading ? 'Mengirim...' : 'Ajukan Reimbursement'}</button>
      </form>
    </section>
  )
}
