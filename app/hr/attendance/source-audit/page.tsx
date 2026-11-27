'use client'
import {useCallback,useState} from 'react'
import { AlertTriangle,CheckCircle2,RefreshCcw,ShieldCheck } from 'lucide-react'
import {supabase} from '@/lib/supabase'
import {Topbar} from '@/components/layout/Topbar'

type Audit={
  ok:boolean;start:string;end:string;employees:number;approvedDays:number;matchedAbsence:number;
  approvedMissing:number;evidenceMissing:number;manualEvidenceMissing:number;officialEvidenceMissing:number;
  conflicts:Array<{employee:string;employee_number:string|null;date:string;request_id:string;request_type:string;attendance_status:string|null;clock_in:string|null;clock_out:string|null;issue:string}>;
}
type Result={ok:boolean;processed:number;remaining:number;updated:number;created:number;linkedEvidence:number;failed:number;conflictCount:number}
function isoMinusDays(offset:number){const d=new Date();d.setUTCDate(d.getUTCDate()-offset);return d.toISOString().slice(0,10)}
export default function AttendanceSourceAuditPage(){
 const [start,setStart]=useState(()=>isoMinusDays(30));const [end,setEnd]=useState(()=>isoMinusDays(0));
 const [data,setData]=useState<Audit|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false)
 const token=async()=>{const {data,error}=await supabase.auth.getSession();if(error||!data.session?.access_token)throw new Error('Sesi HR tidak ditemukan.');return data.session.access_token}
 const run=useCallback(async()=>{
   setBusy(true);setMessage('')
   try {const t=await token();const res=await fetch(`/api/hr/attendance/source-audit?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,{headers:{Authorization:`Bearer ${t}`},cache:'no-store'})
   const result=await res.json();if(!res.ok||!result.ok)throw new Error(result.error||'Audit gagal')
   setData(result as Audit)
   }catch(e){setMessage(e instanceof Error?e.message:'Audit gagal')}
   finally{setBusy(false)}
 },[start,end])
 const reconcile=async()=>{
   if(!window.confirm(`Sinkronkan ulang sumber pengajuan yang sudah disetujui untuk seluruh karyawan aktif pada ${start} s.d. ${end}? Fingerprint, saldo, dan periode terkunci tidak diubah.`))return
   setBusy(true);setMessage('')
   try {const t=await token();const res=await fetch(`/api/hr/attendance/source-audit?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,{
     method:'POST',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify({confirm:true}),cache:'no-store'})
     const result=await res.json() as Result & {error?:string}
     if(!res.ok||!result.ok)throw new Error(result.error||`Sinkronisasi belum lengkap: ${result.processed} diproses, ${result.remaining} tertinggal, ${result.failed} gagal. Lihat laporan, lalu ulangi setelah investigasi.`)
     setMessage(`Sinkronisasi berhasil: ${result.processed} karyawan; ${result.updated} diperbarui; ${result.created} dibuat; ${result.linkedEvidence} bukti terhubung; ${result.conflictCount} konflik tetap untuk review HR.`)
     await run()
   }catch(e){setMessage(e instanceof Error?e.message:'Sinkronisasi gagal')}
   finally{setBusy(false)}
 }
 return <div className="min-h-screen bg-[var(--harmony-surface,#f6f8fc)] text-slate-800">
  <Topbar title="Audit Sumber Kehadiran" description="Rekonsiliasi pengajuan, fingerprint, absensi manual, dan evidence" />
  <main className="mx-auto max-w-7xl space-y-5 p-5 lg:p-8">
    <section className="rounded-[26px] border border-blue-100 bg-white/90 p-5 shadow-sm">
      <h1 className="text-xl font-bold">Konsistensi Kehadiran & Pengajuan</h1>
      <p className="mt-2 text-sm text-slate-600">Fingerprint atau kehadiran manual yang terbukti tidak pernah ditimpa oleh status cuti. Pengajuan yang disetujui tanpa kehadiran diterapkan otomatis; dokumen sumber ditautkan tanpa upload ulang. Tidak ada perubahan saldo dari fitur ini.</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
       <label className="text-xs font-semibold">Mulai <input className="mt-1 block rounded-xl border border-slate-200 p-2 text-sm" type="date" value={start} onChange={e=>setStart(e.target.value)} /></label>
       <label className="text-xs font-semibold">Selesai <input className="mt-1 block rounded-xl border border-slate-200 p-2 text-sm" type="date" value={end} onChange={e=>setEnd(e.target.value)} /></label>
       <button type="button" disabled={busy} onClick={()=>void run()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 px-4 text-sm font-semibold text-blue-700 disabled:opacity-50"><RefreshCcw size={15}/>Audit</button>
       <button type="button" disabled={busy} onClick={()=>void reconcile()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50"><ShieldCheck size={15}/>Sinkronkan Sumber (HR)</button>
      </div>
      {message&&<p role="status" className="mt-3 rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
    </section>
    {data&&<>
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {([['Karyawan',data.employees],['Hari disetujui',data.approvedDays],['Terhubung ke absensi',data.matchedAbsence],['Belum sinkron',data.approvedMissing],['Konflik fingerprint',data.conflicts.length],['Evidence perlu ditautkan',data.evidenceMissing]] as const).map(([label,value])=><div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs text-slate-600">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
      </section>
      <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
       <CheckCircle2 size={16} className="mr-2 inline text-emerald-600"/>Kehadiran manual tanpa bukti utama: {data.manualEvidenceMissing} hari. Tugas luar tanpa bukti utama: {data.officialEvidenceMissing} hari. Lampiran tambahan tetap dapat dilihat melalui tautan pengajuan sumber.
      </div>
      <section className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
       <div className="flex items-center gap-2 border-b border-slate-100 p-5"><AlertTriangle size={18} className="text-amber-600"/><h2 className="font-semibold">Konflik fingerprint — perlu keputusan HR</h2></div>
       <div className="overflow-x-auto"><table className="w-full min-w-[730px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{['Karyawan','Tanggal','Jenis pengajuan','Jam masuk','Jam pulang','Kondisi'].map(k=><th key={k} className="px-4 py-3">{k}</th>)}</tr></thead><tbody>{data.conflicts.map(row=><tr key={`${row.request_id}:${row.date}`} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{row.employee}<p className="text-xs text-slate-500">{row.employee_number}</p></td><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3">{row.request_type}</td><td className="px-4 py-3">{row.clock_in||'–'}</td><td className="px-4 py-3">{row.clock_out||'–'}</td><td className="px-4 py-3 text-amber-700">{row.issue}</td></tr>)}{data.conflicts.length===0&&<tr><td colSpan={6} className="p-8 text-center text-slate-500">Tidak ditemukan konflik pada periode ini.</td></tr>}</tbody></table></div>
       <p className="border-t border-slate-100 p-4 text-xs text-slate-500">Persetujuan dan saldo cuti tidak dikoreksi otomatis. HR perlu memeriksa dokumen pengajuan dan transaksi sebelum melakukan penyesuaian.</p>
      </section>
    </>}
  </main>
 </div>
}
