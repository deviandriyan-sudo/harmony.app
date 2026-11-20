'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCheck, Clock3, ClipboardList, HeartPulse, RefreshCcw, Search, ShieldCheck, UserRoundX, WalletCards } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { CompactMetric } from '@/components/dashboard/CompactMetric'
import { harmonyFetch } from '@/lib/harmony-client'
import { cleanStatus, witaToday, type MonitorCategory, type MonitorItem } from '@/lib/dashboard-monitoring'

type PHLItem = { id:string; name:string; department:string; type:string; date:string|null; status:string|null; href:string }
type Monitoring = {date:string;periodMonth:string;updatedAt:string;summary:{needsHR:number;notConfirmed:number;absent:number;pendingPHL:number};absence:MonitorItem[];phl:PHLItem[]}
const labels: Record<MonitorCategory | 'semua',string> = {semua:'Semua',cuti:'Cuti',sakit:'Sakit',izin:'Izin',phl:'Penggunaan PHL',tugas_luar:'Tugas Luar',belum_tercatat:'Perlu Verifikasi'}
const categories: (MonitorCategory | 'semua')[] = ['semua','cuti','sakit','izin','phl','tugas_luar','belum_tercatat']
function formatDate(date:string|null|undefined) { if(!date)return '—'; const d=new Date(`${date}T00:00:00`);return Number.isNaN(d.getTime())?date:new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(d) }
function stage(value:MonitorItem['approval']){return value==='approved'?'Disetujui':value==='pending'?'Menunggu Persetujuan':'Perlu Verifikasi'}

export default function HRDashboardPage() {
  const [date,setDate]=useState(witaToday)
  const [data,setData]=useState<Monitoring|null>(null)
  const [loading,setLoading]=useState(true)
  const [refreshing,setRefreshing]=useState(false)
  const [error,setError]=useState('')
  const [category,setCategory]=useState<MonitorCategory|'semua'>('semua')
  const [unit,setUnit]=useState('semua')
  const [search,setSearch]=useState('')
  const [showAll,setShowAll]=useState(false)
  const [phlTab,setPHLTab]=useState<'semua'|'Pengajuan Saldo PHL'|'Klaim PHL'>('semua')
  const [phlStatus,setPHLStatus]=useState<'semua'|'pending'|'approved'|'rejected'|'finished'>('semua')
  const load=useCallback(async()=>{
    setRefreshing(true)
    try {const payload=await harmonyFetch<Monitoring>(`/api/hr/dashboard/monitoring?date=${encodeURIComponent(date)}`);setData(payload);setError('')}
    catch(issue:unknown){setError(issue instanceof Error?issue.message:'Monitoring HR gagal dimuat.');setData(null)}
    finally{setLoading(false);setRefreshing(false)}
  },[date])
  useEffect(()=>{queueMicrotask(()=>{void load()})},[load])
  const units=useMemo(()=>[...new Set((data?.absence||[]).map(x=>x.department).filter(x=>x&&x!=='—'))].sort((a,b)=>a.localeCompare(b,'id')),[data])
  const filtered=useMemo(()=> (data?.absence||[]).filter(item=>{
    if(category!=='semua'&&item.category!==category)return false
    if(unit!=='semua'&&item.department!==unit)return false
    return !search||`${item.name} ${item.department}`.toLowerCase().includes(search.trim().toLowerCase())
  }),[data,category,unit,search])
  const phl=(data?.phl||[]).filter(item=>{
    if(phlTab!=='semua'&&item.type!==phlTab)return false
    const current=cleanStatus(item.status)
    if(phlStatus==='pending')return !['approved','finalized','paid','rejected','cancelled','canceled','ditolak'].includes(current)
    if(phlStatus==='approved')return ['approved','approve'].includes(current)
    if(phlStatus==='rejected')return ['rejected','ditolak','cancelled','canceled'].includes(current)
    if(phlStatus==='finished')return ['finalized','paid','completed','done'].includes(current)
    return true
  }).slice(0,8)
  const pending=[
    {label:'Review HR untuk cuti/izin dan PHL',value:data?.summary.needsHR||0,href:'/hr/leave',icon:ClipboardList},
    {label:'Konfirmasi kehadiran belum selesai',value:data?.summary.notConfirmed||0,href:'/hr/attendance/data',icon:Clock3},
    {label:'Klaim dan saldo PHL menunggu proses',value:data?.summary.pendingPHL||0,href:'/hr/phl',icon:WalletCards},
    {label:'Finalisasi dan review absensi',value:null,href:'/hr/attendance/approvals',icon:CheckCheck},
    {label:'Review Re-Med',value:null,href:'/remed/hr/dashboard',icon:HeartPulse},
    {label:'Training Request SCALE UP',value:null,href:'/hr/scale-up',icon:ShieldCheck},
  ]
  return <>
    <Topbar title="Dashboard HR" compact />
    <main className="harmony-rc2o harmony-rc2o-hr harmony-glass-showcase mx-auto max-w-[1500px] space-y-4 p-4 sm:p-5 lg:p-6">
      <section className="harmony-rc2o-hero flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7" aria-label="Ringkasan monitoring HR">
        <div className="relative z-10 min-w-0"><p className="harmony-rc2o-hero-kicker">HARMONY · HR WORKSPACE</p><h1 className="mt-1 text-[25px] font-bold tracking-tight sm:text-[29px]">HR Operations Overview</h1><p className="mt-1 text-sm">Monitoring kehadiran, pengajuan, dan aktivitas karyawan dalam satu dashboard.</p><p className="mt-2 text-xs opacity-80">Periode monitoring: {formatDate(date)} · {data?.updatedAt?'Data terakhir diperbarui '+new Date(data.updatedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Makassar'})+' WITA':'Belum diperbarui'}</p></div>
        <button type="button" onClick={()=>void load()} disabled={refreshing} className="harmony-rc2o-hero-button relative z-10 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"><RefreshCcw size={16} className={refreshing?'animate-spin':''}/>Refresh</button>
      </section>
      {error&&<div role="alert" className="harmony-rc2o-error flex items-center gap-2 rounded-2xl p-3 text-sm"><AlertTriangle size={16}/>{error}</div>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-busy={loading}>
        <CompactMetric label="Review HR · Cuti/PHL" value={loading?'…':data?.summary.needsHR??'—'} icon={ClipboardList} href="/hr/leave" accent="amber"/>
        <CompactMetric label="Belum Konfirmasi Absensi" value={loading?'…':data?.summary.notConfirmed??'—'} icon={Clock3} href="/hr/attendance/data"/>
        <CompactMetric label="Monitoring Tidak Hadir" value={loading?'…':data?.summary.absent??'—'} icon={UserRoundX} href="#harmony-monitoring-kehadiran" accent="amber"/>
        <CompactMetric label="PHL Perlu Proses" value={loading?'…':data?.summary.pendingPHL??'—'} icon={WalletCards} href="#harmony-monitoring-phl" accent="green"/>
      </div>
      <section id="harmony-monitoring-kehadiran" className="harmony-rc2o-panel scroll-mt-24 overflow-hidden" aria-label="Monitoring ketidakhadiran">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5"><div><h2 className="harmony-rc2o-panel-title">Siapa yang Tidak Hadir Hari Ini?</h2><p className="harmony-rc2o-muted mt-1 text-sm">Cuti, sakit, izin, penggunaan PHL, tugas luar, dan data yang perlu diverifikasi.</p></div><label className="harmony-rc2o-muted flex items-center gap-2 text-xs font-semibold">Tanggal <input type="date" value={date} onChange={event=>{setDate(event.target.value);setShowAll(false)}} className="harmony-rc2o-input min-h-10 rounded-xl px-3 text-sm"/></label></div>
        <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5" role="group" aria-label="Filter jenis ketidakhadiran">
          {categories.map(cat=><button key={cat} type="button" onClick={()=>{setCategory(cat);setShowAll(false)}} aria-pressed={category===cat} className={`harmony-rc2o-filter rounded-xl px-3 py-2 text-xs font-semibold ${category===cat?'is-active':''}`}>{labels[cat]} <span className="ml-1 opacity-70">{cat==='semua'?(data?.absence||[]).length:(data?.absence||[]).filter(item=>item.category===cat).length}</span></button>)}
        </div>
        <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5"><label className="harmony-rc2o-search flex min-w-[160px] flex-1 items-center gap-2 rounded-xl px-3"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama karyawan..." aria-label="Cari karyawan" className="h-10 w-full bg-transparent text-sm outline-none"/></label><select value={unit} onChange={e=>setUnit(e.target.value)} aria-label="Filter unit kerja" className="harmony-rc2o-input max-w-full rounded-xl px-3 text-sm"><option value="semua">Semua unit</option>{units.map(value=><option key={value} value={value}>{value}</option>)}</select></div>
        <div className="harmony-rc2o-divider"/>
        {loading&&!data?<p role="status" className="harmony-rc2o-muted p-5 text-sm">Memuat data kehadiran...</p>:filtered.length===0?<p className="harmony-rc2o-muted px-5 py-8 text-center text-sm">Tidak ada catatan untuk filter dan tanggal ini. Belum tercatat bukan berarti alpa.</p>:<div className="divide-y harmony-rc2o-rows">{filtered.slice(0,showAll?filtered.length:8).map(item=><div key={item.id} className="harmony-rc2o-row flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"><div className="harmony-rc2o-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold">{item.name.slice(0,1).toUpperCase()}</div><div className="min-w-[140px] flex-1"><p className="harmony-rc2o-strong truncate text-sm font-semibold">{item.name}</p><p className="harmony-rc2o-muted truncate text-xs">{item.department}</p></div><div className="min-w-[110px]"><p className="harmony-rc2o-strong text-xs font-semibold">{labels[item.category]}</p><p className="harmony-rc2o-muted text-xs">{formatDate(item.startDate)}{item.endDate!==item.startDate?' – '+formatDate(item.endDate):''}</p></div><span className={`harmony-rc2o-status ${item.approval}`}>{stage(item.approval)}</span><Link href={item.href} className="harmony-rc2o-link inline-flex items-center gap-1 text-xs font-semibold">Detail <ArrowRight size={14}/></Link></div>)}</div>}
        {filtered.length>8&&<button type="button" onClick={()=>setShowAll(x=>!x)} className="harmony-rc2o-link w-full border-t px-4 py-3 text-center text-sm font-semibold">{showAll?'Tampilkan lebih sedikit':`Lihat semua (${filtered.length})`}</button>}
        <p className="harmony-rc2o-muted border-t px-4 py-3 text-xs">Ketidakhadiran hanya ditampilkan dari pengajuan atau catatan yang tersedia; tanpa check-in belum otomatis berarti alpa. Status pending dipisahkan dari persetujuan final.</p>
      </section>
      <div className="grid items-start gap-4 xl:grid-cols-[1.12fr_.88fr]">
        <section id="harmony-monitoring-phl" className="harmony-rc2o-panel scroll-mt-24 overflow-hidden"><div className="p-4 sm:p-5"><h2 className="harmony-rc2o-panel-title">Pengajuan & Klaim PHL</h2><p className="harmony-rc2o-muted mt-1 text-xs">Saldo PHL dan penggunaan PHL adalah transaksi berbeda.</p></div><div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">{(['semua','Pengajuan Saldo PHL','Klaim PHL'] as const).map(tab=><button key={tab} type="button" aria-pressed={phlTab===tab} onClick={()=>setPHLTab(tab)} className={`harmony-rc2o-filter rounded-xl px-3 py-2 text-xs font-semibold ${phlTab===tab?'is-active':''}`}>{tab==='semua'?'Semua':tab}</button>)}</div><div className="px-4 pb-3 sm:px-5"><label className="harmony-rc2o-muted inline-flex items-center gap-2 text-xs font-semibold">Status <select aria-label="Filter status PHL" value={phlStatus} onChange={event=>setPHLStatus(event.target.value as typeof phlStatus)} className="harmony-rc2o-input min-h-9 rounded-xl px-2 text-xs"><option value="semua">Semua</option><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option><option value="finished">Selesai</option></select></label></div><div className="harmony-rc2o-divider"/>{phl.length===0?<p className="harmony-rc2o-muted p-5 text-sm">Tidak ada pengajuan pada kategori ini.</p>:phl.map(row=><Link href={row.href} key={`${row.type}-${row.id}`} className="harmony-rc2o-row flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0"><span className="min-w-0"><span className="harmony-rc2o-strong block truncate text-xs font-semibold">{row.name}</span><span className="harmony-rc2o-muted block truncate text-xs">{row.type} · {formatDate(row.date)}</span></span><span className="harmony-rc2o-link shrink-0 text-xs font-semibold">{cleanStatus(row.status).replaceAll('_',' ')||'Periksa'} <ArrowRight size={13} className="inline"/></span></Link>)}<Link href="/hr/phl" className="harmony-rc2o-link block border-t px-4 py-3 text-right text-xs font-semibold">Buka seluruh PHL →</Link></section>
        <section className="harmony-rc2o-panel overflow-hidden"><div className="p-4 sm:p-5"><h2 className="harmony-rc2o-panel-title">Perlu Tindakan HR</h2><p className="harmony-rc2o-muted mt-1 text-xs">Akses tugas melalui workflow yang sudah berlaku.</p></div><div className="harmony-rc2o-divider"/>{pending.map(({label,value,href,icon:Icon})=><Link key={href+label} href={href} className="harmony-rc2o-row flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0"><span className="flex min-w-0 items-center gap-2.5"><Icon size={17} className="harmony-rc2o-link shrink-0"/><span className="harmony-rc2o-strong truncate text-xs font-semibold">{label}</span></span><span className="harmony-rc2o-link flex items-center gap-2 text-xs">{value!==null?<strong>{value}</strong>:null}<ArrowRight size={15}/></span></Link>)}</section>
      </div>
    </main>
  </>
}
