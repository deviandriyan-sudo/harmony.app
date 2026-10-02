'use client'

import { ChangeEvent, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Loader2, PenLine, RefreshCw, Save, Search, ShieldCheck, Upload, WalletCards } from 'lucide-react'

import { remedFetch } from '@/lib/remed-client'
import type { RemedSignatureManagementRow } from '@/types/remed'

export default function RemedSignatureManagementPage() {
  const [rows, setRows] = useState<RemedSignatureManagementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [hrEmployeeId, setHrEmployeeId] = useState('')
  const [financeEmployeeId, setFinanceEmployeeId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const result = await remedFetch<{ employees: RemedSignatureManagementRow[] }>('/api/remed/signatures?scope=management')
      setRows(result.employees)
      const hr = result.employees.find((row: RemedSignatureManagementRow) => row.signer_role === 'hr')
      const finance = result.employees.find((row: RemedSignatureManagementRow) => row.signer_role === 'finance')
      setHrEmployeeId(hr?.id || '')
      setFinanceEmployeeId(finance?.id || '')
      setSelectedEmployeeId((current: string) => current || hr?.id || result.employees[0]?.id || '')
    } catch (error: any) {
      setMessage(error?.message || 'Gagal memuat manajemen tanda tangan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return rows
    return rows.filter((row: RemedSignatureManagementRow) => [row.full_name, row.employee_number, row.department, row.position, row.email].some((value) => String(value || '').toLowerCase().includes(keyword)))
  }, [query, rows])

  const selected = rows.find((row: RemedSignatureManagementRow) => row.id === selectedEmployeeId) || null
  const hrSigner = rows.find((row: RemedSignatureManagementRow) => row.id === hrEmployeeId) || null
  const financeSigner = rows.find((row: RemedSignatureManagementRow) => row.id === financeEmployeeId) || null

  async function saveRole(role: 'hr' | 'finance', employeeId: string) {
    if (!employeeId) return
    setSaving(true)
    setMessage('')
    try {
      await remedFetch('/api/remed/signatures', {
        method: 'PATCH',
        body: JSON.stringify({ role, employee_id: employeeId }),
      })
      setMessage(`Penandatangan ${role === 'hr' ? 'HR' : 'Finance'} berhasil diperbarui.`)
      await load()
    } catch (error: any) {
      setMessage(error?.message || 'Gagal memperbarui penandatangan.')
    } finally {
      setSaving(false)
    }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] || null)
  }


  async function uploadForSelected() {
    if (!selectedEmployeeId || !file) {
      setMessage('Pilih employee dan file tanda tangan terlebih dahulu.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const form = new FormData()
      form.append('employee_id', selectedEmployeeId)
      form.append('file', file)
      await remedFetch('/api/remed/signatures', { method: 'POST', body: form })
      setFile(null)
      setMessage('Tanda tangan employee berhasil diperbarui.')
      await load()
    } catch (error: any) {
      setMessage(error?.message || 'Gagal upload tanda tangan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Manajemen Tanda Tangan</h1>
          <p className="mt-2 text-sm text-[#6e6e73]">Atur penandatangan HR/Finance dan kelola tanda tangan karyawan untuk form pembayaran Re-Med.</p>
        </div>
        <button type="button" onClick={load} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold shadow-sm disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <RoleCard
          title="Penandatangan HR"
          subtitle="Tanda tangan pada bagian Diperiksa HR"
          icon={<ShieldCheck size={20} />}
          rows={rows}
          value={hrEmployeeId}
          onChange={setHrEmployeeId}
          signer={hrSigner}
          onSave={() => saveRole('hr', hrEmployeeId)}
          saving={saving}
        />
        <RoleCard
          title="Penandatangan Finance"
          subtitle="Tanda tangan pada bagian Diproses Finance"
          icon={<WalletCards size={20} />}
          rows={rows}
          value={financeEmployeeId}
          onChange={setFinanceEmployeeId}
          signer={financeSigner}
          onSave={() => saveRole('finance', financeEmployeeId)}
          saving={saving}
        />
      </div>

      <div className="mt-6 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold"><PenLine size={18} /> Tanda Tangan Karyawan</div>
            <p className="mt-1 text-sm text-[#6e6e73]">HR dapat membantu upload/replace. Karyawan juga dapat mengganti tanda tangannya sendiri dari menu Akun & Tanda Tangan.</p>
          </div>
          <div className="relative w-full sm:w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]" />
            <input value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} placeholder="Cari nama, NIK, unit..." className="w-full rounded-2xl bg-[#f5f5f7] py-3 pl-10 pr-4 text-sm outline-none" />
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="max-h-[520px] overflow-auto rounded-2xl border border-black/5">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center"><Loader2 className="animate-spin text-[#18794e]" /></div>
            ) : filtered.length ? (
              <div className="divide-y divide-black/5">
                {filtered.map((row: RemedSignatureManagementRow) => (
                  <button key={row.id} type="button" onClick={() => { setSelectedEmployeeId(row.id); setFile(null) }} className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition ${selectedEmployeeId === row.id ? 'bg-[#eef7f3]' : 'hover:bg-[#fafafa]'}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1d1d1f]">{row.full_name || '-'}</p>
                      <p className="mt-0.5 truncate text-xs text-[#6e6e73]">{row.employee_number || '-'} · {row.department || '-'} · {row.position || '-'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${row.signature_url ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{row.signature_url ? 'Ada TTD' : 'Belum Ada'}</span>
                      {row.signer_role && <p className="mt-1 text-[10px] font-semibold uppercase text-[#6e6e73]">{row.signer_role}</p>}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center p-5 text-sm text-[#8e8e93]">Data tidak ditemukan.</div>
            )}
          </div>

          <div className="rounded-2xl border border-black/5 bg-[#fafafa] p-5">
            <p className="text-sm font-semibold">{selected?.full_name || 'Pilih employee'}</p>
            <p className="mt-1 text-xs text-[#6e6e73]">{selected?.employee_number || '-'} · {selected?.department || '-'}</p>
            <div className="mt-4 flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white p-4">
              {selected?.signature_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.signature_url} alt={`Tanda tangan ${selected.full_name || ''}`} className="max-h-32 max-w-full object-contain" />
              ) : (
                <p className="text-center text-sm text-[#8e8e93]">Belum ada tanda tangan.</p>
              )}
            </div>
            <label className="mt-4 flex min-h-12 cursor-pointer items-center rounded-2xl bg-white px-4 text-sm text-[#6e6e73] shadow-sm">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} className="hidden" />
              <span className="truncate">{file?.name || 'Pilih PNG/JPG/WEBP...'}</span>
            </label>
            <button type="button" onClick={uploadForSelected} disabled={!selectedEmployeeId || !file || saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18794e] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Upload / Replace
            </button>
          </div>
        </div>
      </div>

      {message && <div className="mt-5 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm shadow-sm">{message}</div>}
    </section>
  )
}

function RoleCard({
  title,
  subtitle,
  icon,
  rows,
  value,
  onChange,
  signer,
  onSave,
  saving,
}: {
  title: string
  subtitle: string
  icon: ReactNode
  rows: RemedSignatureManagementRow[]
  value: string
  onChange: (value: string) => void
  signer: RemedSignatureManagementRow | null
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef7f3] text-[#18794e]">{icon}</div>
        <div>
          <p className="font-semibold text-[#1d1d1f]">{title}</p>
          <p className="mt-1 text-xs text-[#6e6e73]">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <select value={value} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)} className="min-w-0 rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm outline-none">
          <option value="">Pilih employee...</option>
          {rows.map((row: RemedSignatureManagementRow) => <option key={row.id} value={row.id}>{row.full_name || '-'} · {row.employee_number || '-'}</option>)}
        </select>
        <button type="button" onClick={onSave} disabled={!value || saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
        </button>
      </div>
      <div className="mt-4 flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-black/10 bg-[#fafafa] p-4">
        {signer?.signature_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signer.signature_url} alt={`Tanda tangan ${signer.full_name || ''}`} className="max-h-24 max-w-full object-contain" />
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#1d1d1f]">{signer?.full_name || 'Belum dipilih'}</p>
            <p className="mt-1 text-xs text-amber-700">Tanda tangan belum tersedia.</p>
          </div>
        )}
      </div>
      {signer && <p className="mt-3 text-xs text-[#6e6e73]">Aktif: <span className="font-semibold text-[#1d1d1f]">{signer.full_name}</span> · {signer.employee_number || '-'}</p>}
    </div>
  )
}
