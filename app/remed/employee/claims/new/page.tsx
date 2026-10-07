'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus2, Loader2, Paperclip, Send, X } from 'lucide-react'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { remedFetch } from '@/lib/remed-client'
import { supabase } from '@/lib/supabase'
import { REMED_BUCKET } from '@/lib/remed'
import type { RemedClaimType, RemedSession } from '@/types/remed'

export default function NewRemedClaimPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [types, setTypes] = useState<RemedClaimType[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadLabel, setUploadLabel] = useState('')
  const [message, setMessage] = useState('')
  const [bankName, setBankName] = useState('Bank Sinarmas')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankFromMaster, setBankFromMaster] = useState(false)

  useEffect(() => {
    Promise.all([
      remedFetch<{ claimTypes: RemedClaimType[] }>('/api/remed/claim-types'),
      remedFetch<{ session: RemedSession }>('/api/remed/session'),
    ])
      .then(([claimTypePayload, sessionPayload]) => {
        setTypes(claimTypePayload.claimTypes || [])
        const session = sessionPayload.session
        const savedNumber = String(session.bankAccountNumber || '').trim()
        const savedName = String(session.bankAccountName || '').trim()
        setBankName(String(session.bankName || 'Bank Sinarmas').trim() || 'Bank Sinarmas')
        setBankAccountNumber(savedNumber)
        setBankAccountName(savedName)
        setBankFromMaster(Boolean(savedNumber && savedName))
      })
      .catch((error) => setMessage(error?.message || 'Gagal memuat data Re-Med.'))
  }, [])

  function onFiles(input: FileList | null) {
    // FileList is a live browser object. Snapshot it before the native input is
    // cleared, otherwise React's queued state updater can observe an empty list.
    const selectedFiles = input ? Array.from(input) : []
    if (!selectedFiles.length) return

    const allowedTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ])
    const maxFileSize = 10 * 1024 * 1024

    const accepted: File[] = []
    for (const file of selectedFiles) {
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      const typeAllowed = allowedTypes.has(file.type) || ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(extension)

      if (!typeAllowed) {
        setMessage(`Format ${file.name} tidak didukung. Gunakan PDF/JPG/PNG/WEBP.`)
        continue
      }
      if (file.size <= 0) {
        setMessage(`File ${file.name} kosong atau tidak dapat dibaca.`)
        continue
      }
      if (file.size > maxFileSize) {
        setMessage(`File ${file.name} melebihi 10 MB.`)
        continue
      }
      accepted.push(file)
    }

    if (!accepted.length) return

    setFiles((current) => {
      const remainingSlots = Math.max(0, 3 - current.length)
      const nextFiles = [...current, ...accepted.slice(0, remainingSlots)]
      if (accepted.length > remainingSlots) {
        queueMicrotask(() => setMessage('Maksimal 3 file bukti kuitansi.'))
      } else {
        queueMicrotask(() => setMessage(''))
      }
      return nextFiles
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // React's currentTarget is only guaranteed during the synchronous event
    // callback. Capture the form payload before the first await so FormData
    // never receives a cleared/non-form currentTarget after the upload step.
    const formData = new FormData(event.currentTarget)

    setMessage('')
    if (files.length < 1) {
      setMessage('Minimal 1 bukti kuitansi wajib diunggah.')
      return
    }

    setLoading(true)
    try {
      const ticketPayload = await remedFetch<{ tickets: Array<{ path: string; token: string; fileName: string; mimeType: string; fileSize: number }> }>('/api/remed/uploads/receipts', {
        method: 'POST',
        body: JSON.stringify({ files: files.map((file) => ({ name: file.name, mimeType: file.type, size: file.size })) }),
      })

      const tickets = ticketPayload.tickets || []
      if (tickets.length !== files.length) throw new Error('Upload ticket kuitansi tidak lengkap.')

      try {
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index]
          const ticket = tickets[index]
          setUploadLabel(`Mengunggah bukti ${index + 1}/${files.length}...`)
          const { error: uploadError } = await supabase.storage
            .from(REMED_BUCKET)
            .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: ticket.mimeType })
          if (uploadError) throw new Error(`Gagal mengunggah ${file.name}: ${uploadError.message}`)
        }

        setUploadLabel('Menyimpan pengajuan...')
        formData.append('staged_receipts', JSON.stringify(tickets.map(({ path, fileName, mimeType, fileSize }) => ({ path, fileName, mimeType, fileSize }))))
        const result = await remedFetch<{ claimId: string; claimNumber: string; notification?: { ok?: boolean; message?: string } | null }>('/api/remed/claims', { method: 'POST', body: formData })
        const notificationWarning = result.notification?.ok === false
          ? `\n\nCatatan: klaim tersimpan, tetapi email notifikasi belum terkirim lengkap: ${result.notification.message || 'cek konfigurasi notifikasi.'}`
          : ''
        window.alert(`Klaim ${result.claimNumber} berhasil diajukan.${notificationWarning}`)
        router.push('/remed/employee/claims')
      } catch (uploadError) {
        await remedFetch('/api/remed/uploads/receipts', {
          method: 'DELETE',
          body: JSON.stringify({ paths: tickets.map((ticket) => ticket.path) }),
        }).catch(() => null)
        throw uploadError
      }
    } catch (error: any) {
      setMessage(error?.message || 'Gagal mengajukan reimbursement.')
    } finally {
      setUploadLabel('')
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="harmony-section-title">Rekening Pembayaran</h2>
              <p className="harmony-section-copy">Rekening Bank Sinarmas diambil otomatis dari master karyawan berdasarkan nama pemilik rekening.</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${bankFromMaster ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {bankFromMaster ? 'Terisi otomatis' : 'Belum tersimpan di master'}
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="harmony-label">Bank</span>
              <input name="bank_name" required readOnly value={bankName} onChange={(event) => setBankName(event.target.value)} className="harmony-input bg-white/55" />
            </label>
            <label className="block">
              <span className="harmony-label">Nomor Rekening</span>
              <input name="bank_account_number" required readOnly={bankFromMaster} value={bankAccountNumber} onChange={(event) => setBankAccountNumber(event.target.value)} className="harmony-input bg-white/55" placeholder="Nomor rekening Bank Sinarmas" />
            </label>
            <label className="block">
              <span className="harmony-label">Nama Pemilik Rekening</span>
              <input name="bank_account_name" required readOnly={bankFromMaster} value={bankAccountName} onChange={(event) => setBankAccountName(event.target.value)} className="harmony-input bg-white/55" placeholder="Nama pemilik rekening" />
            </label>
          </div>
          {!bankFromMaster ? (
            <p className="mt-3 text-xs leading-5 text-amber-700">Data rekening belum tersedia di master HARMONY. Anda masih dapat mengisi nomor rekening dan nama pemilik secara manual untuk klaim ini.</p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="harmony-section-title">Bukti Kuitansi</h2>
              <p className="harmony-section-copy">Minimal 1 file dan maksimal 3 file.</p>
            </div>
            <span className="rounded-full bg-[#eef0f3] px-3 py-1 text-xs font-bold text-[#646971]">{files.length}/3</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp"
            className="sr-only"
            onChange={(event) => {
              // Snapshot synchronously before resetting the native input.
              onFiles(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
            disabled={files.length >= 3}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= 3}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Paperclip size={18} /> {files.length >= 3 ? 'Maksimal 3 File' : 'Pilih File'}
          </button>

          {files.length ? (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-[16px] border border-black/[0.055] bg-[#f8f9fb] px-4 py-3 text-sm">
                  <div className="min-w-0 pr-3"><span className="block truncate font-semibold">{file.name}</span><span className="mt-0.5 block text-[11px] text-[#8a8f98]">{Math.max(1, Math.round(file.size / 1024))} KB · siap diunggah saat pengajuan dikirim</span></div>
                  <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex h-8 w-8 items-center justify-center rounded-[11px] text-red-500 transition hover:bg-red-50"><X size={17} /></button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <button disabled={loading} type="submit" className="harmony-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 disabled:opacity-60">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {loading ? (uploadLabel || 'Mengirim...') : 'Ajukan Reimbursement'}
        </button>
      </form>
    </section>
  )
}
