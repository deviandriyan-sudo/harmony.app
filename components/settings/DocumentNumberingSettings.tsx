'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Hash, RefreshCcw, Search } from 'lucide-react'
import { harmonyFetch } from '@/lib/harmony-client'
import { normalizeManualDocumentNumber, type DocumentNumberMode } from '@/lib/document-numbering'

type Module = 'remed' | 'scaleup'
type State = 'all' | 'issued' | 'pending' | 'legacy' | 'blocked' | 'unavailable'
type Filters = { search: string; month: string; state: State; status: string }
type DocumentRow = { id: string; reference: string | null; legacy_reference: string | null; employee_name: string | null; created_at: string | null; status: string | null; document_number: string | null; document_number_mode: DocumentNumberMode | null; numbering_state: Exclude<State,'all'>; issued_at: string | null; issue_reason: string | null; issued_by_id: string | null; issued_by: string | null }
type History = { id: string; old_mode: DocumentNumberMode; new_mode: DocumentNumberMode; actor_id: string; actor_name: string | null; reason: string; created_at: string }
type Catalog = { mode: DocumentNumberMode; total: number; rows: DocumentRow[]; counts: Record<State,number>; statuses: string[]; mode_history: History[] }
const endpoint = '/api/hr/document-numbering'
const initial: Filters = { search:'', month:'', state:'all', status:'' }
const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900'
const button = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50'
const primary = 'rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
const labels: Record<State,string> = { all:'Semua dokumen', issued:'Terbit', pending:'Menunggu nomor', legacy:'Referensi lama', blocked:'Tidak eligible', unavailable:'Perlu pemeriksaan' }
const docs = { remed:{name:'Re-Med',title:'Form Permohonan Pembayaran',format:'RM-YYYYMM-00001',period:'Bulanan (UTC)'}, scaleup:{name:'SCALE UP',title:'Formulir Pengajuan Training',format:'SU-YYYYMM-00001',period:'Bulanan (WITA)'} } as const
const modeLabel = (mode: DocumentNumberMode | null) => mode === 'auto' ? 'Otomatis' : mode === 'manual' ? 'Manual' : 'Historis'
const statusLabel = (status: string | null) => ({pending_hr:'Menunggu HR',pending_finance:'Menunggu Finance',waiting_payment:'Menunggu pembayaran',paid:'Dibayar',rejected_hr:'Ditolak HR',rejected_finance:'Ditolak Finance',legacy_record:'Arsip',cancelled:'Dibatalkan',approved:'Disetujui',rejected:'Ditolak',revision_required:'Perlu revisi',pending:'Menunggu persetujuan'} as Record<string,string>)[status ?? ''] || status?.replaceAll('_',' ') || 'Tidak tersedia'
const date = (value: string | null) => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('id-ID',{timeZone:'Asia/Makassar',day:'2-digit',month:'short',year:'numeric'}) }
const numberLabel = (row: DocumentRow) => row.document_number || (row.numbering_state === 'legacy' ? row.legacy_reference || 'Referensi tidak tersedia' : row.numbering_state === 'pending' ? 'Belum diterbitkan' : 'Tidak tersedia')

export function DocumentNumberingSettings() {
  const [opened, setOpened] = useState(false)
  const [module, setModule] = useState<Module>('remed')
  const [data, setData] = useState<Catalog | null>(null)
  const [mode, setMode] = useState<DocumentNumberMode>('auto')
  const [draft, setDraft] = useState<Filters>(initial)
  const [filters, setFilters] = useState<Filters>(initial)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState('')
  const [number, setNumber] = useState('')
  const [modeReason, setModeReason] = useState('')
  const [issueReason, setIssueReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const generation = useRef(0)
  const mutation = useRef(false)
  const detail = useRef<HTMLDivElement>(null)
  useEffect(() => () => { ++generation.current }, [])

  async function load(target: Module, page = 0, criteria: Filters = initial) {
    const request = ++generation.current
    setModule(target); setOffset(page); setFilters(criteria); setLoading(true); setError(''); setData(null)
    setSelected(''); setNumber(''); setModeReason(''); setIssueReason('')
    try {
      const params = new URLSearchParams({view:'catalog', module:target, offset:String(page), ...criteria})
      const next = await harmonyFetch<Catalog>(`${endpoint}?${params}`)
      if (generation.current !== request) return
      setData(next); setMode(next.mode)
    } catch (issue) {
      if (generation.current === request) setError(issue instanceof Error ? issue.message : 'Daftar dokumen tidak tersedia.')
    } finally { if (generation.current === request) setLoading(false) }
  }
  const chosen = data?.rows.find(row => row.id === selected)
  async function mutate(action: 'set_mode' | 'issue') {
    if (!data || loading || mutation.current) return
    const normalized = normalizeManualDocumentNumber(number)
    if (action === 'issue' && (!chosen || chosen.numbering_state !== 'pending' || !normalized || issueReason.trim().length < 3)) return
    if (action === 'set_mode' && (mode === data.mode || modeReason.trim().length < 3)) return
    const confirmed = action === 'issue'
      ? window.confirm(`Terbitkan nomor ${normalized} untuk ${chosen?.reference || chosen?.id} (${chosen?.employee_name || 'Karyawan'})? Nomor tidak dapat diubah.`)
      : window.confirm(`Ubah mode ${docs[module].name} menjadi ${mode === 'auto' ? 'Otomatis' : 'Manual'} untuk pengajuan baru?${mode === 'manual' ? ' Pastikan RC3Q sudah aktif di seluruh domain production.' : ''}`)
    if (!confirmed) return
    mutation.current = true; setSaving(true); setError(''); setNotice('')
    const request = generation.current
    try {
      await harmonyFetch(endpoint, { method:'POST', body:JSON.stringify(action === 'set_mode'
        ? { module, action, mode, expected_mode: data.mode, reason:modeReason }
        : { module, action, document_id: selected, number:normalized, reason:issueReason }) })
      if (generation.current !== request) return
      setNotice(action === 'issue' ? `Nomor ${normalized} berhasil diterbitkan.` : 'Mode penomoran berhasil disimpan.')
      await load(module,0,filters)
    } catch (issue) {
      if (generation.current === request) { setError(issue instanceof Error ? issue.message : 'Perubahan belum dapat dikonfirmasi. Muat ulang terlebih dahulu.'); setData(null); setSelected('') }
    } finally { mutation.current = false; setSaving(false) }
  }
  function switchModule(target: Module) { setDraft(initial); setNotice(''); void load(target) }
  function toggle() {
    if (saving) return
    if (opened) { ++generation.current; setOpened(false); setLoading(false); setData(null); setSelected(''); return }
    setOpened(true); switchModule(module)
  }
  function choose(row: DocumentRow) { setSelected(row.id); setNumber(''); setIssueReason(''); setNotice(''); requestAnimationFrame(() => { detail.current?.focus(); detail.current?.scrollIntoView({block:'nearest'}) }) }
  return <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
    <button type="button" onClick={toggle} aria-expanded={opened} className="flex w-full items-center justify-between gap-3 text-left" disabled={saving}>
      <span className="flex items-center gap-3"><Hash size={22} className="harmony-text-link"/><span><strong className="block text-sm harmony-text-primary">Penomoran Dokumen</strong><small className="harmony-text-secondary">Konfigurasi, register dan riwayat penerbitan</small></span></span><span className="text-sm harmony-text-secondary">{opened ? 'Tutup' : 'Kelola'}</span>
    </button>
    {opened && <div className="mt-5 space-y-5 border-t border-black/10 pt-4">
      <div className="grid gap-3 sm:grid-cols-2">{(['remed','scaleup'] as const).map(item => <button key={item} type="button" aria-pressed={item===module} disabled={saving} onClick={()=>switchModule(item)} className={`rounded-2xl border p-4 text-left ${item===module?'border-slate-800 bg-slate-50':'border-slate-200 bg-white'}`}><span className="flex items-center gap-2 text-xs font-semibold text-slate-600"><FileText size={15}/>{docs[item].name}</span><strong className="mt-1 block text-sm text-slate-900">{docs[item].title}</strong><span className="mt-1 block text-xs text-slate-600">{docs[item].format}</span></button>)}</div>
      <div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-slate-900">{docs[module].title}</h3><button type="button" className={button} disabled={saving||loading} onClick={()=>void load(module,offset,filters)}><RefreshCcw size={14} className="mr-1 inline"/> Muat ulang</button></div>
      {loading && <p role="status" className="text-sm harmony-text-secondary">Memuat register dokumen…</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {data && <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{(Object.keys(labels) as State[]).map(state=><button key={state} type="button" aria-pressed={filters.state===state} disabled={saving} onClick={()=>{const next={...filters,state};setDraft(next);void load(module,0,next)}} className={`rounded-xl border p-3 text-left ${filters.state===state?'border-slate-700 bg-slate-50':'border-slate-200'}`}><span className="block text-xs text-slate-600">{labels[state]}</span><strong className="mt-1 block text-xl tabular-nums text-slate-900">{data.counts[state]}</strong></button>)}</div>
        <details className="rounded-2xl border border-slate-200 p-4" open>
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Konfigurasi penerbitan · {modeLabel(data.mode)}</summary>
          <p className="mt-2 text-xs text-slate-600">Mode hanya untuk pengajuan baru. Format otomatis {docs[module].format} · reset {docs[module].period.toLowerCase()}. Nomor yang terbit dan referensi historis tetap.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-semibold">Metode<select className={field} value={mode} disabled={saving} onChange={e=>setMode(e.target.value==='manual'?'manual':'auto')}><option value="auto">Otomatis</option><option value="manual">Manual oleh HR</option></select></label><label className="space-y-1 text-sm font-semibold">Alasan perubahan<input className={field} maxLength={500} value={modeReason} disabled={saving} onChange={e=>setModeReason(e.target.value)}/></label></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-600">Mode manual hanya setelah seluruh domain production kompatibel.</p><button type="button" className={primary} disabled={saving||mode===data.mode||modeReason.trim().length<3} onClick={()=>void mutate('set_mode')}>Simpan metode</button></div>
        </details>
        <div className="space-y-3"><h3 className="text-sm font-semibold text-slate-900">Register dokumen</h3><form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e=>{e.preventDefault();void load(module,0,draft)}}>
          <label className="text-xs font-semibold text-slate-700">Pencarian<input className={field} value={draft.search} maxLength={120} onChange={e=>setDraft({...draft,search:e.target.value})} placeholder="Nama / nomor / judul" disabled={saving}/></label>
          <label className="text-xs font-semibold text-slate-700">Periode<input type="month" className={field} value={draft.month} onChange={e=>setDraft({...draft,month:e.target.value})} disabled={saving}/></label>
          <label className="text-xs font-semibold text-slate-700">Penomoran<select className={field} value={draft.state} onChange={e=>setDraft({...draft,state:e.target.value as State})} disabled={saving}>{(Object.keys(labels) as State[]).map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-700">Status pengajuan<select className={field} value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})} disabled={saving}><option value="">Semua status</option>{data.statuses.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><button type="submit" className={primary} disabled={saving}><Search size={14} className="mr-1 inline"/> Terapkan</button><button type="button" className={button} disabled={saving} onClick={()=>{setDraft(initial);void load(module)}}>Reset</button></div>
        </form>
        <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr>{['Karyawan / referensi','Tanggal','Nomor dokumen','Status pengajuan','Penomoran','Aksi'].map(h=><th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.rows.map(row=><tr key={row.id} className={selected===row.id?'bg-slate-50':''}><td className="px-3 py-3"><strong className="block text-slate-900">{row.employee_name||'Nama tidak tersedia'}</strong><small className="block max-w-[250px] break-words text-slate-600">{row.reference||row.id}</small></td><td className="whitespace-nowrap px-3 py-3 text-slate-700">{date(row.created_at)}</td><td className="max-w-[210px] break-all px-3 py-3 font-medium text-slate-900">{numberLabel(row)}</td><td className="px-3 py-3 text-slate-700">{statusLabel(row.status)}</td><td className="px-3 py-3 text-xs text-slate-700">{labels[row.numbering_state]}<span className="block text-slate-500">{modeLabel(row.document_number_mode)}</span></td><td className="px-3 py-3"><button type="button" className={row.numbering_state==='pending'?primary:button} disabled={saving} onClick={()=>choose(row)}>{row.numbering_state==='pending'?'Terbitkan':'Detail'}</button></td></tr>)}</tbody></table>{data.rows.length===0&&<p className="p-5 text-center text-sm text-slate-600">{data.total===0?'Tidak ada dokumen sesuai filter.':'Halaman kosong. Kembali ke halaman sebelumnya.'}</p>}</div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>{data.rows.length?offset+1:0}–{offset+data.rows.length} dari {data.total} hasil</span><div className="flex gap-2"><button type="button" className={button} disabled={saving||offset===0} onClick={()=>void load(module,Math.max(0,offset-50),filters)}>Sebelumnya</button><button type="button" className={button} disabled={saving||offset+50>=data.total||offset>=100000} onClick={()=>void load(module,offset+50,filters)}>Berikutnya</button></div></div></div>
        {chosen&&<div ref={detail} tabIndex={-1} className="space-y-3 rounded-2xl border border-slate-300 bg-slate-50 p-4 focus:outline-slate-500"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">{docs[module].title}</h3><p className="text-sm text-slate-700">{chosen.employee_name||'Nama tidak tersedia'} · {date(chosen.created_at)}</p></div><button type="button" className={button} disabled={saving} onClick={()=>setSelected('')}>Tutup detail</button></div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-600">Nomor yang ditampilkan</dt><dd className="break-all font-semibold">{numberLabel(chosen)}</dd></div><div><dt className="text-xs text-slate-600">Referensi transaksi</dt><dd className="break-all">{chosen.legacy_reference||chosen.id}</dd></div><div><dt className="text-xs text-slate-600">Judul / referensi</dt><dd className="break-words">{chosen.reference||'—'}</dd></div><div><dt className="text-xs text-slate-600">Status</dt><dd>{statusLabel(chosen.status)} · {labels[chosen.numbering_state]}</dd></div><div><dt className="text-xs text-slate-600">Diterbitkan</dt><dd>{date(chosen.issued_at)} · {chosen.issued_by||chosen.issued_by_id||(chosen.document_number_mode==='auto'&&chosen.issued_at?'Sistem':'—')}</dd></div><div><dt className="text-xs text-slate-600">Alasan penerbitan</dt><dd className="break-words">{chosen.issue_reason||'—'}</dd></div></dl>
          {chosen.numbering_state==='pending'?<><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-semibold">Nomor manual<input className={field} maxLength={80} value={number} disabled={saving} onChange={e=>setNumber(e.target.value)} placeholder={module==='remed'?'001/REM/2026':'001/TRN/2026'}/></label><label className="space-y-1 text-sm font-semibold">Alasan penerbitan<input className={field} maxLength={500} value={issueReason} disabled={saving} onChange={e=>setIssueReason(e.target.value)}/></label></div><p className="text-xs text-slate-600">Preview nomor: {normalizeManualDocumentNumber(number)||'—'}. Nomor unik lintas modul; awalan RM- dan SU- dicadangkan. Nomor yang terbit tidak dapat diubah.</p><button type="button" className={primary} disabled={saving||!normalizeManualDocumentNumber(number)||issueReason.trim().length<3} onClick={()=>void mutate('issue')}>{saving?'Memproses…':'Terbitkan nomor'}</button></>:<p className="text-xs text-slate-600">{chosen.numbering_state==='legacy'?'Dokumen historis memakai referensi asli. Tidak di-backfill.':chosen.numbering_state==='issued'?'Nomor resmi terkunci.':'Dokumen ini tidak dapat diterbitkan nomor melalui alur manual.'}</p>}
          {chosen.numbering_state==='issued'||chosen.numbering_state==='legacy'?<a className="inline-block text-sm font-semibold underline text-slate-800" href={module==='remed'?`/remed/hr/claims/${encodeURIComponent(chosen.id)}/print`:'/hr/scale-up'} target="_blank" rel="noopener noreferrer">{module==='remed'?'Buka dokumen cetak':'Buka pengajuan SCALE UP untuk cetak'}</a>:null}
        </div>}
        <details className="rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Riwayat konfigurasi (20 terakhir)</summary>{data.mode_history.length===0?<p className="mt-3 text-sm text-slate-600">Belum ada perubahan mode tercatat.</p>:<div className="mt-3 space-y-2">{data.mode_history.map(h=><div key={h.id} className="border-t border-slate-200 pt-2 text-sm"><strong>{modeLabel(h.old_mode)} → {modeLabel(h.new_mode)}</strong><p className="text-xs text-slate-600">{date(h.created_at)} · {h.actor_name||h.actor_id}</p><p className="break-words text-slate-700">{h.reason}</p></div>)}</div>}</details>
      </>}
    </div>}
  </section>
}
