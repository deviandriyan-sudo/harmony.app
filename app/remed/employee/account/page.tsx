'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useState } from 'react'
import { Loader2, PenLine, RefreshCw, Settings, ShieldCheck, Trash2, Upload } from 'lucide-react'

import { remedFetch } from '@/lib/remed-client'
import type { RemedSession, RemedSignatureDisplay } from '@/types/remed'

export default function RemedEmployeeAccountPage() {
  const [session, setSession] = useState<RemedSession | null>(null)
  const [signature, setSignature] = useState<RemedSignatureDisplay | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const [sessionResult, signatureResult] = await Promise.all([
        remedFetch<{ session: RemedSession }>('/api/remed/session'),
        remedFetch<{ signature: RemedSignatureDisplay | null }>('/api/remed/signatures'),
      ])
      setSession(sessionResult.session)
      setSignature(signatureResult.signature)
    } catch (error: any) {
      setMessage(error?.message || 'Gagal memuat akun Re-Med.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function uploadSignature() {
    if (!file) {
      setMessage('Pilih file tanda tangan terlebih dahulu.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const form = new FormData()
      form.append('file', file)
      const result = await remedFetch<{ signature: RemedSignatureDisplay | null }>('/api/remed/signatures', {
        method: 'POST',
        body: form,
      })
      setSignature(result.signature)
      setFile(null)
      setMessage('Tanda tangan berhasil diperbarui.')
    } catch (error: any) {
      setMessage(error?.message || 'Gagal memperbarui tanda tangan.')
    } finally {
      setSaving(false)
    }
  }

  async function resetSignature() {
    if (!window.confirm('Hapus tanda tangan yang tersimpan?')) return
    setSaving(true)
    setMessage('')
    try {
      const result = await remedFetch<{ signature: RemedSignatureDisplay | null }>('/api/remed/signatures', {
        method: 'DELETE',
        body: JSON.stringify({}),
      })
      setSignature(result.signature)
      setFile(null)
      setMessage('Tanda tangan berhasil dihapus.')
    } catch (error: any) {
      setMessage(error?.message || 'Gagal menghapus tanda tangan.')
    } finally {
      setSaving(false)
    }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] || null)
  }

  return (
    <section className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Akun & Tanda Tangan Re-Med</h1>
          <p className="mt-2 text-sm text-[#6e6e73]">Kelola identitas Re-Med dan tanda tangan yang digunakan pada form reimbursement.</p>
        </div>
        <button type="button" onClick={load} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold shadow-sm disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={22} />
          </div>
          <p className="mt-4 text-lg font-semibold">{session?.userName || 'Employee'}</p>
          <p className="mt-1 text-sm text-[#6e6e73]">{session?.email || '-'}</p>
          <p className="mt-4 text-sm leading-6 text-[#6e6e73]">Re-Med menggunakan akun HARMONY yang sama. Tidak ada login atau password Re-Med terpisah.</p>
          <Link href="/employee/settings" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-sm font-semibold text-white">
            <Settings size={17} /> Pengaturan HARMONY
          </Link>
        </div>

        <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1d1d1f]"><PenLine size={17} /> Tanda Tangan Digital</div>
              <p className="mt-1 text-xs leading-5 text-[#6e6e73]">PNG/JPG/WEBP maksimal 2 MB. Tanda tangan ini akan muncul pada form pembayaran Re-Med milik Anda.</p>
            </div>
            <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#6e6e73]">
              {signature?.signature_source === 'upload' ? 'Upload Pribadi' : signature?.signature_source === 'seed' ? 'Import Awal' : 'Belum Ada'}
            </span>
          </div>

          <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-black/15 bg-[#fafafa] p-5">
            {loading ? (
              <Loader2 className="animate-spin text-[#18794e]" />
            ) : signature?.signature_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signature.signature_url} alt="Tanda tangan" className="max-h-32 max-w-full object-contain" />
            ) : (
              <p className="text-center text-sm text-[#8e8e93]">Belum ada tanda tangan. Upload file untuk mengaktifkannya.</p>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="flex min-h-12 cursor-pointer items-center rounded-2xl bg-[#f5f5f7] px-4 text-sm text-[#6e6e73]">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} className="hidden" />
              <span className="truncate">{file?.name || 'Pilih file tanda tangan...'}</span>
            </label>
            <button type="button" onClick={uploadSignature} disabled={!file || saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#18794e] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Simpan
            </button>
          </div>

          {signature?.signature_source === 'upload' && (
            <button type="button" onClick={resetSignature} disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50">
              <Trash2 size={16} /> Hapus Tanda Tangan
            </button>
          )}
        </div>
      </div>

      {message && <div className="mt-5 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-[#1d1d1f] shadow-sm">{message}</div>}
    </section>
  )
}
