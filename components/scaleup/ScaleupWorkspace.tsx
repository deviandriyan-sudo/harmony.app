'use client'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, Award, BookOpen, Check, FileText, GraduationCap, Loader2, Plus, Printer, RefreshCcw, Settings2, ShieldCheck, X } from 'lucide-react'
import Image from 'next/image'
import { harmonyFetch } from '@/lib/harmony-client'
import { planScaleupApproval, ROLE_LABELS, type Nominees, type ScaleupRole, type ApprovalPolicy } from '@/lib/scaleup/workflow'

type Person={id:string;full_name:string|null;employee_number?:string|null;department?:string|null;position?:string|null}
type Stage={id:string;stage_order:number;approver_employee_id:string;obligations:ScaleupRole[];label:string;identity_snapshot:{name?:string;position?:string;unit?:string};status:string;decided_at?:string}
type RequestRow={id:string;requester_employee_id:string;requester:Person|null;training:Training;nominees:Nominees;approval_status:string;execution_status:string;request_version:number;total_estimated_budget:number;submitted_at:string;stages:Stage[]}
type Training={title:string;start_date:string;end_date:string;category:string;type:string;provider:string;objective:string;competency:string;description:string;method:string;location:string;justification:string;estimated_cost:number;transportation_cost:number;accommodation_cost:number;other_cost:number;total_budget:number}
type RecordRow={id:string;employee_id:string;employee:Person|null;request_id:string|null;training:Training;source:string;completed_at:string|null;realized_cost:number;competency_acquired?:string;certificates:{id:string;original_name:string;certificate_number:string|null;expiration_date:string|null}[]}
type Authority={id:string;role_key:string;employee_id:string;requester_id?:string|null;assignment_id?:string|null;is_active:boolean;employee?:Person;reason:string}
type Tab='overview'|'new'|'requests'|'approvals'|'records'|'configuration'
const money=(v:unknown)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v||0))
const date=(v?:string|null)=>v?new Date(v).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'—'
const emptyTraining:Training={title:'',start_date:'',end_date:'',category:'',type:'external',provider:'',objective:'',competency:'',description:'',method:'offline',location:'',justification:'',estimated_cost:0,transportation_cost:0,accommodation_cost:0,other_cost:0,total_budget:0}
const emptyNominees:Nominees={supervisor_1:'',supervisor_2:'',wadirsdk:'',finance:'',director:''}
const roles:ScaleupRole[]=['supervisor_1','supervisor_2','wadirsdk','finance','director']
const statusMap:Record<string,string>={pending_approval:'Menunggu persetujuan',revision_required:'Perlu revisi',rejected:'Ditolak',approved:'Disetujui',cancelled:'Dibatalkan',waiting:'Belum aktif',pending:'Menunggu',completed:'Selesai',scheduled:'Terjadwal'}

function PersonPicker({role,value,onSelect,hr=false,label}:{role?:ScaleupRole;value:Person|null;onSelect:(person:Person|null)=>void;hr?:boolean;label:string}){
  const [query,setQuery]=useState(''),[list,setList]=useState<Person[]>([]),[busy,setBusy]=useState(false),[opened,setOpened]=useState(false),[message,setMessage]=useState('')
  useEffect(()=>{if(!opened)return;const controller=new AbortController();const timer=setTimeout(()=>{
    setBusy(true);const url=hr?`/api/scaleup/employee-search?q=${encodeURIComponent(query)}`:`/api/scaleup/candidates?role=${role}&q=${encodeURIComponent(query)}`
    harmonyFetch<{employees?:Person[];candidates?:Person[];configured?:boolean}>(url,{signal:controller.signal})
      .then(res=>{setList(res.employees||res.candidates||[]);setMessage(res.configured===false?'Belum ada pejabat yang dikonfigurasi HR.':'')})
      .catch(err=>{if(!controller.signal.aborted)setMessage(err instanceof Error?err.message:'Pencarian gagal.')})
      .finally(()=>{if(!controller.signal.aborted)setBusy(false)})
  },hr&&!query?500:300);return()=>{controller.abort();clearTimeout(timer)}},[query,opened,role,hr])
  return <div className="scaleup-field relative">
    <label className="scaleup-label">{label}</label>
    {value?<div className="scaleup-selected"><div className="min-w-0"><strong>{value.full_name}</strong><small>{value.position||'Jabatan belum diisi'} · {value.department||'Unit tidak tersedia'}</small></div><button type="button" aria-label={`Ganti ${label}`} onClick={()=>{onSelect(null);setOpened(true);setQuery('')}}><X size={15}/></button></div>
    :<><input type="search" className="scaleup-input" placeholder={hr?'Cari nama karyawan (min. 2 huruf)':'Cari pejabat yang berwenang'} value={query} onFocus={()=>setOpened(true)} onChange={e=>{setQuery(e.target.value);setOpened(true)}} aria-label={label}/>
      {opened&&<div className="scaleup-dropdown" role="listbox" aria-label={`Pilihan ${label}`}>
        {busy&&<p>Memuat karyawan...</p>}{message&&<p>{message}</p>}
        {!busy&&list.length===0&&<p>{hr&&!query?'Ketik minimal 2 huruf.':'Tidak ada kandidat sesuai otorisasi.'}</p>}
        {list.map(item=><button key={item.id} type="button" role="option" aria-selected="false" onClick={()=>{onSelect(item);setOpened(false);setQuery('');setMessage('')}}><strong>{item.full_name||'Tanpa nama'}</strong><small>{item.position||'—'} · {item.department||'—'}</small></button>)}
        <button type="button" className="scaleup-dropdown-dismiss" onClick={()=>setOpened(false)}>Tutup pilihan</button>
      </div>}</>}
  </div>
}

export function ScaleupWorkspace({mode}:{mode:'hr'|'employee'}) {
  const hr=mode==='hr';const [tab,setTab]=useState<Tab>('overview'),[data,setData]=useState<RequestRow[]>([])
  const [records,setRecords]=useState<RecordRow[]>([]),[authorities,setAuthorities]=useState<Authority[]>([])
  const [policy,setPolicy]=useState<ApprovalPolicy|null>(null),[policyVersion,setPolicyVersion]=useState<number|null>(null)
  const [myId,setMyId]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [training,setTraining]=useState<Training>(emptyTraining),[nominees,setNominees]=useState<Nominees>(emptyNominees)
  const [chosen,setChosen]=useState<Partial<Record<ScaleupRole,Person>>>({}),[existing,setExisting]=useState<string|null>(null)
  const [extraSupervisor,setExtraSupervisor]=useState(false),[directorEnabled,setDirectorEnabled]=useState(false)
  const [remark,setRemark]=useState(''),[printRequest,setPrintRequest]=useState<RequestRow|null>(null)
  const [authRole,setAuthRole]=useState('wadirsdk'),[authPerson,setAuthPerson]=useState<Person|null>(null)
  const [authRequester,setAuthRequester]=useState<Person|null>(null),[authAssignment,setAuthAssignment]=useState(''),[authReason,setAuthReason]=useState('')
  const [legacyPerson,setLegacyPerson]=useState<Person|null>(null),[legacyTitle,setLegacyTitle]=useState(''),[legacyDate,setLegacyDate]=useState('')
  const [legacyCost,setLegacyCost]=useState(0),[legacyCompetency,setLegacyCompetency]=useState(''),[legacyProvider,setLegacyProvider]=useState('')
  const [completeDate,setCompleteDate]=useState(new Date().toISOString().slice(0,10)),[completeCost,setCompleteCost]=useState(0),[completeCompetency,setCompleteCompetency]=useState('')
  const [recordForCertificate,setRecordForCertificate]=useState(''),[certFile,setCertFile]=useState<File|null>(null)
  const [certNumber,setCertNumber]=useState(''),[certExpiry,setCertExpiry]=useState('')
  const updateTraining=(field:keyof Training,value:string|number)=>setTraining(prev=>({...prev,[field]:value}))
  // Fetching and committing UI state are separate so the initial effect only
  // subscribes to an asynchronous result (and ignores stale/unmounted results).
  const fetchWorkspace=useCallback(async()=>{
    const [main,recs]=await Promise.all([
      harmonyFetch<{requests:RequestRow[];policy:{version:number;config:ApprovalPolicy};employee:Person|null}>('/api/scaleup'),
      harmonyFetch<{records:RecordRow[]}>('/api/scaleup/records'),
    ])
    const auth=hr?await harmonyFetch<{authorities:Authority[]}>('/api/scaleup/authorities'):null
    return {main,recs,auth}
  },[hr])
  const applyWorkspace=useCallback((payload:Awaited<ReturnType<typeof fetchWorkspace>>)=>{
    const {main,recs,auth}=payload
    setData(main.requests);setPolicy(main.policy.config);setPolicyVersion(main.policy.version)
    setMyId(main.employee?.id||'');setRecords(recs.records)
    if(auth)setAuthorities(auth.authorities)
  },[])
  const refresh=useCallback(async()=>{
    try{
      applyWorkspace(await fetchWorkspace())
      setError('')
    }catch(e){setError(e instanceof Error?e.message:'Tidak dapat memuat SCALE UP.')}
    finally{setLoading(false)}
  },[fetchWorkspace,applyWorkspace])
  useEffect(()=>{
    let active=true
    void fetchWorkspace()
      .then(payload=>{if(active){applyWorkspace(payload);setError('')}})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:'Tidak dapat memuat SCALE UP.')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[fetchWorkspace,applyWorkspace])
  const action=async<T,>(fn:()=>Promise<T>,success:string):Promise<boolean>=>{
    setBusy(true);setError('');setNotice('');try{await fn();setNotice(success);await refresh();return true}catch(e){setError(e instanceof Error?e.message:'Proses gagal.');return false}finally{setBusy(false)}
  }
  const activeStage=(row:RequestRow)=>row.stages.find(x=>x.status==='pending')
  const myApprovals=data.filter(r=>activeStage(r)?.approver_employee_id===myId)
  const myRequests=data.filter(r=>r.requester_employee_id===myId)
  const totalBudget=data.reduce((n,r)=>n+Number(r.total_estimated_budget||0),0)
  const realized=records.reduce((n,r)=>n+Number(r.realized_cost||0),0)
  const updateNominee=(role:ScaleupRole,person:Person|null)=>{
    setChosen(prev=>{const next={...prev};if(person)next[role]=person;else delete next[role];return next})
    setNominees(prev=>({...prev,[role]:person?.id||''}))
  }
  const totalForm=['estimated_cost','transportation_cost','accommodation_cost','other_cost'].reduce((n,key)=>n+Number(training[key as keyof Training]||0),0)
  const planPreview=useMemo(()=>{if(!policy)return null;try{return planScaleupApproval(nominees,policy)}catch{return null}},[nominees,policy])
  function startRevision(row:RequestRow){
    setTraining({...emptyTraining,...row.training});setNominees({...emptyNominees,...row.nominees})
    const selected:Partial<Record<ScaleupRole,Person>>={}
    for(const key of roles){const stage=row.stages.find(s=>s.obligations.includes(key));if(stage&&row.nominees[key as keyof Nominees])selected[key]={id:stage.approver_employee_id,full_name:stage.identity_snapshot?.name||'Approver',position:stage.identity_snapshot?.position,department:stage.identity_snapshot?.unit}}
    setChosen(selected);setExtraSupervisor(Boolean(row.nominees.supervisor_2));setDirectorEnabled(Boolean(row.nominees.director))
    setExisting(row.id);setTab('new');setNotice('Periksa kembali seluruh data dan pilih approver yang masih berwenang.')
  }
  const submit=async(e:FormEvent)=>{e.preventDefault();if(!planPreview){setError('Lengkapi semua mandatory approver terlebih dahulu.');return}
    const ok=await action(()=>harmonyFetch('/api/scaleup',{method:'POST',body:JSON.stringify({...training,nominees,existing_id:existing,idempotency_key:crypto.randomUUID()})}),'Pengajuan training berhasil dikirim.')
    if(ok){setExisting(null);setTraining(emptyTraining);setNominees(emptyNominees);setChosen({});setTab('requests')}
  }
  const decide=(stage:Stage,decision:string)=>action(()=>harmonyFetch('/api/scaleup/decide',{method:'POST',body:JSON.stringify({stage_id:stage.id,action:decision,remarks:remark,idempotency_key:crypto.randomUUID()})}),'Keputusan persetujuan berhasil dicatat.')
  const savedReport=()=>{
    const header=['ID','Pemohon','Judul','Status','Estimasi','Tanggal']
    const lines=data.map(r=>[r.id,r.requester?.full_name||'',r.training.title,r.approval_status,String(r.total_estimated_budget),r.submitted_at.slice(0,10)])
    const csv=[header,...lines].map(row=>row.map(c=>`"${String(c).replaceAll('"','""')}"`).join(',')).join('\r\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}))
    a.download='SCALE_UP_Laporan_Training.csv';a.click();URL.revokeObjectURL(a.href)
  }
  const tabs:{key:Tab;label:string;show:boolean}[]=[
    {key:'overview',label:'Overview',show:true},{key:'new',label:existing?'Revisi Pengajuan':'Training Request',show:true},
    {key:'requests',label:hr?'Seluruh Pengajuan':'My Requests',show:true},
    {key:'approvals',label:`Approval (${myApprovals.length})`,show:true},
    {key:'records',label:'Learning Records',show:true},
    {key:'configuration',label:'Configuration',show:hr},
  ]
  if(loading)return <div className="scaleup-root scaleup-wait"><Loader2 className="animate-spin"/> Memuat SCALE UP...</div>
  return <div className="scaleup-root">
    <header className="scaleup-hero"><div><span className="scaleup-eyebrow">HARMONY / TRAINING & DEVELOPMENT</span><h1>SCALE UP<span className="scaleup-hero-mark">.</span></h1><p>Learn. Grow. Advance. <span>· Training, competency & learning ecosystem</span></p></div><div className="scaleup-hero-symbol"><GraduationCap size={44} strokeWidth={1.4}/></div></header>
    <div className="scaleup-toolbar"><nav className="scaleup-tabs" aria-label="SCALE UP Navigation">{tabs.filter(t=>t.show).map(t=><button type="button" key={t.key} className={tab===t.key?'active':''} aria-current={tab===t.key?'page':undefined} onClick={()=>{setTab(t.key);setError('');setNotice('')}}>{t.label}</button>)}</nav><button title="Muat ulang" type="button" className="scaleup-icon-button" onClick={()=>void refresh()}><RefreshCcw size={17}/></button></div>
    {error&&<div role="alert" className="scaleup-alert error">{error}<button type="button" onClick={()=>setError('')} aria-label="Tutup pesan"><X size={16}/></button></div>}
    {notice&&<div role="status" className="scaleup-alert success">{notice}<button type="button" onClick={()=>setNotice('')} aria-label="Tutup pesan"><X size={16}/></button></div>}
    {tab==='overview'&&<><section className="scaleup-metrics">
      {[{title:'Training Requests',value:hr?data.length:myRequests.length,icon:BookOpen},
        {title:'Perlu Approval Saya',value:myApprovals.length,icon:ShieldCheck},
        {title:'Training Disetujui',value:data.filter(x=>x.approval_status==='approved').length,icon:Check},
        {title:'Training Selesai',value:records.length,icon:Award}].map(m=><div key={m.title} className="scaleup-metric"><div className="scaleup-metric-icon"><m.icon size={18}/></div><small>{m.title}</small><strong>{m.value}</strong></div>)}
    </section><div className="scaleup-grid"><section className="scaleup-panel"><div className="scaleup-panel-header"><h2>Aktivitas terbaru</h2><button type="button" onClick={()=>setTab('requests')}>Lihat semua</button></div>
      {data.length?data.slice(0,7).map(r=><div className="scaleup-row" key={r.id}><div><strong>{r.training.title}</strong><small>{hr?r.requester?.full_name:date(r.submitted_at)} · {date(r.training.start_date)}</small></div><span className="scaleup-status">{statusMap[r.approval_status]||r.approval_status}</span></div>):<p className="scaleup-empty">Belum ada pengajuan training.</p>}</section>
      <section className="scaleup-panel"><div className="scaleup-panel-header"><h2>Learning & Budget</h2><Activity size={18}/></div><div className="scaleup-summary-line"><span>Training record</span><strong>{records.length}</strong></div><div className="scaleup-summary-line"><span>Estimasi biaya</span><strong>{money(totalBudget)}</strong></div><div className="scaleup-summary-line"><span>Realisasi biaya</span><strong>{money(realized)}</strong></div><p className="scaleup-caption">Nilai berdasarkan data training yang dapat diakses akun ini. Tidak menggunakan dummy data.</p><button className="scaleup-primary" type="button" onClick={()=>setTab('new')}><Plus size={16}/> Ajukan Training</button></section></div></>}
    {tab==='new'&&<form onSubmit={submit} className="scaleup-panel scaleup-form"><div className="scaleup-panel-header"><div><span className="scaleup-section-no">01 / REQUEST DETAILS</span><h2>{existing?'Revisi Pengajuan Training':'Ajukan Training Baru'}</h2></div><BookOpen size={21}/></div>
      <div className="scaleup-form-grid">
        <Field label="Nama Training *" value={training.title} onChange={v=>updateTraining('title',v)} required/>
        <Field label="Penyelenggara / Provider" value={training.provider} onChange={v=>updateTraining('provider',v)}/>
        <SelectField label="Jenis Training" value={training.type} options={['internal','external']} onChange={v=>updateTraining('type',v)}/>
        <Field label="Kategori Training" value={training.category} onChange={v=>updateTraining('category',v)}/>
        <Field type="date" label="Mulai *" value={training.start_date} onChange={v=>updateTraining('start_date',v)} required/>
        <Field type="date" label="Selesai *" value={training.end_date} onChange={v=>updateTraining('end_date',v)} required/>
        <SelectField label="Metode" value={training.method} options={['offline','online','hybrid']} onChange={v=>updateTraining('method',v)}/>
        <Field label="Lokasi" value={training.location} onChange={v=>updateTraining('location',v)}/>
        <TextArea label="Tujuan Training" value={training.objective} onChange={v=>updateTraining('objective',v)}/>
        <TextArea label="Kompetensi yang Diharapkan" value={training.competency} onChange={v=>updateTraining('competency',v)}/>
        <TextArea label="Justifikasi Pemohon" value={training.justification} onChange={v=>updateTraining('justification',v)}/>
      </div><div className="scaleup-divider"/><span className="scaleup-section-no">02 / COST ESTIMATE</span><h3>Perkiraan Biaya</h3>
      <div className="scaleup-form-grid">{([['estimated_cost','Training'],['transportation_cost','Transportasi'],['accommodation_cost','Akomodasi'],['other_cost','Lainnya']] as const).map(([key,label])=><Field key={key} label={`${label} (IDR)`} type="number" value={String(training[key])} onChange={v=>updateTraining(key,Number(v))}/>)}</div><div className="scaleup-budget-total"><span>Total Estimasi</span><strong>{money(totalForm)}</strong></div>
      <div className="scaleup-divider"/><span className="scaleup-section-no">03 / MANUAL APPROVER SELECTION</span><h3>Alur Persetujuan</h3><p className="scaleup-caption">Seluruh pejabat dipilih sendiri dari employee master. Kedua Wadir wajib; perubahan jenis tahap wajib hanya melalui konfigurasi HR.</p>
      <div className="scaleup-form-grid">
        <PersonPicker role="supervisor_1" label="Atasan 1 *" value={chosen.supervisor_1||null} onSelect={p=>updateNominee('supervisor_1',p)}/>
        {extraSupervisor&&<PersonPicker role="supervisor_2" label="Atasan 2 (opsional)" value={chosen.supervisor_2||null} onSelect={p=>updateNominee('supervisor_2',p)}/>}
        <PersonPicker role="wadirsdk" label="Wadir Sumber Daya dan Kelembagaan *" value={chosen.wadirsdk||null} onSelect={p=>updateNominee('wadirsdk',p)}/>
        <PersonPicker role="finance" label="Wadir Keuangan *" value={chosen.finance||null} onSelect={p=>updateNominee('finance',p)}/>
        {directorEnabled&&<PersonPicker role="director" label="Direktur" value={chosen.director||null} onSelect={p=>updateNominee('director',p)}/>}
      </div><div className="scaleup-inline-actions"><button type="button" onClick={()=>{setExtraSupervisor(v=>!v);updateNominee('supervisor_2',null)}}><Plus size={15}/>{extraSupervisor?'Hapus Atasan 2':'Tambah Atasan 2'}</button><button type="button" onClick={()=>{setDirectorEnabled(v=>!v);updateNominee('director',null)}}><Plus size={15}/>{directorEnabled?'Hapus Direktur':'Tambahkan Direktur'}</button></div>
      <div className="scaleup-plan-preview"><strong>Preview tahapan persetujuan</strong>{planPreview?planPreview.map(s=><div key={s.order}><span>{String(s.order).padStart(2,'0')}</span>{s.label}<small>{chosen[s.obligations[0]]?.full_name||'Pejabat terpilih'}</small></div>):<p>Lengkapi seluruh approver wajib untuk melihat urutan final. Jika pejabat merangkap fungsi, sistem menampilkan penggabungan tahap.</p>}</div>
      <footer className="scaleup-form-footer"><button className="scaleup-primary" type="submit" disabled={busy||!planPreview}>{busy?'Memproses...':existing?'Kirim Revisi':'Kirim Pengajuan'}</button></footer>
    </form>}
    {(tab==='requests'||tab==='approvals')&&<section className="scaleup-panel"><div className="scaleup-panel-header"><div><span className="scaleup-section-no">TRAINING REQUEST MANAGEMENT</span><h2>{tab==='approvals'?'Menunggu Persetujuan Saya':'Monitoring Pengajuan'}</h2></div><FileText size={20}/></div>
      {(tab==='approvals'?myApprovals:data).length===0&&<p className="scaleup-empty">Tidak ada pengajuan pada daftar ini.</p>}
      {(tab==='approvals'?myApprovals:data).map(row=><article className="scaleup-request" key={row.id}>
        <div className="scaleup-request-head"><div><h3>{row.training.title}</h3><p>{row.requester?.full_name||'Employee'} · {date(row.training.start_date)} – {date(row.training.end_date)} · {money(row.total_estimated_budget)}</p></div><span className="scaleup-status">{statusMap[row.approval_status]||row.approval_status}</span></div>
        <div className="scaleup-timeline">{row.stages.map(s=><div key={s.id} className={`scaleup-stage ${s.status}`}><span className="scaleup-stage-icon">{s.status==='approved'?<Check size={14}/>:String(s.stage_order)}</span><div><strong>{s.label}</strong><small>{s.identity_snapshot?.name||'Pejabat'} · {statusMap[s.status]||s.status}{s.decided_at?` · ${date(s.decided_at)}`:''}</small></div></div>)}</div>
        <div className="scaleup-request-actions"><button type="button" onClick={()=>{setPrintRequest(row);setTimeout(()=>window.print(),100)}}><Printer size={15}/> Cetak A4 / PDF</button>
          {row.requester_employee_id===myId&&row.approval_status==='revision_required'&&<button type="button" onClick={()=>startRevision(row)}>Perbaiki & Kirim Ulang</button>}
          {hr&&row.approval_status==='approved'&&row.execution_status!=='completed'&&<div className="scaleup-complete"><input aria-label="Tanggal selesai" type="date" value={completeDate} onChange={e=>setCompleteDate(e.target.value)}/><input aria-label="Realisasi biaya" type="number" min="0" value={completeCost} onChange={e=>setCompleteCost(Number(e.target.value))}/><input aria-label="Kompetensi diperoleh" placeholder="Kompetensi diperoleh" value={completeCompetency} onChange={e=>setCompleteCompetency(e.target.value)}/><button type="button" disabled={busy} onClick={()=>void action(()=>harmonyFetch('/api/scaleup/records',{method:'POST',body:JSON.stringify({action:'complete',request_id:row.id,completed_at:completeDate,realized_cost:completeCost,competency:completeCompetency})}),'Training telah diverifikasi selesai.')}>Konfirmasi Completion</button></div>}
        </div>
        {activeStage(row)?.approver_employee_id===myId&&<div className="scaleup-decision"><label className="scaleup-label">Catatan approval (wajib untuk Reject/Revisi)<textarea value={remark} onChange={e=>setRemark(e.target.value)} placeholder="Tulis catatan keputusan..."/></label><div className="scaleup-inline-actions"><button type="button" disabled={busy} onClick={()=>void decide(activeStage(row)!,'approve')}>Approve</button><button type="button" disabled={busy||remark.trim().length<5} onClick={()=>void decide(activeStage(row)!,'revision')}>Request Revision</button><button type="button" disabled={busy||remark.trim().length<5} onClick={()=>void decide(activeStage(row)!,'reject')}>Reject</button></div></div>}
      </article>)}
    </section>}
    {tab==='records'&&<section className="scaleup-panel"><div className="scaleup-panel-header"><div><span className="scaleup-section-no">LEARNING HISTORY & CERTIFICATIONS</span><h2>Training Records</h2></div><Award size={20}/></div>
      {records.length===0?<p className="scaleup-empty">Belum ada riwayat training yang diverifikasi.</p>:records.map(r=><div className="scaleup-record" key={r.id}><div><strong>{r.training.title}</strong><small>{hr?`${r.employee?.full_name||'Karyawan'} · `:''}{date(r.completed_at)} · {r.source==='legacy_manual'?'Riwayat Manual':'Dari Pengajuan'}</small><small>Biaya realisasi: {money(r.realized_cost)} · {r.competency_acquired||'Kompetensi belum dicatat'}</small>{r.certificates.map(c=><button type="button" key={c.id} className="scaleup-file-link" onClick={()=>void action(async()=>{const result=await harmonyFetch<{url:string}>(`/api/scaleup/documents?id=${c.id}`);window.open(result.url,'_blank','noopener,noreferrer')},'Tautan sertifikat dibuka.')}>{c.original_name} · Kedaluwarsa {date(c.expiration_date)}</button>)}</div><span className="scaleup-status">Completed</span></div>)}
      {hr&&<><div className="scaleup-divider"/><h3>Input Training Historis</h3><div className="scaleup-form-grid"><PersonPicker hr label="Pilih Karyawan" value={legacyPerson} onSelect={setLegacyPerson}/><Field label="Nama Training" value={legacyTitle} onChange={setLegacyTitle}/><Field label="Penyelenggara" value={legacyProvider} onChange={setLegacyProvider}/><Field type="date" label="Tanggal Selesai" value={legacyDate} onChange={setLegacyDate}/><Field type="number" label="Biaya Aktual" value={String(legacyCost)} onChange={v=>setLegacyCost(Number(v))}/><Field label="Kompetensi" value={legacyCompetency} onChange={setLegacyCompetency}/></div><button type="button" className="scaleup-primary" disabled={busy||!legacyPerson||!legacyDate||legacyTitle.trim().length<3} onClick={()=>void action(()=>harmonyFetch('/api/scaleup/records',{method:'POST',body:JSON.stringify({action:'legacy',employee_id:legacyPerson?.id,title:legacyTitle,provider:legacyProvider,completed_at:legacyDate,realized_cost:legacyCost,competency:legacyCompetency})}),'Riwayat training historis tersimpan.')}>Simpan Riwayat</button></>}
      <div className="scaleup-divider"/><h3>Unggah Sertifikat</h3><div className="scaleup-form-grid"><div className="scaleup-field"><label className="scaleup-label">Training Record</label><select value={recordForCertificate} onChange={e=>setRecordForCertificate(e.target.value)}><option value="">Pilih record</option>{records.map(r=><option key={r.id} value={r.id}>{r.training.title} · {r.employee?.full_name||'Saya'}</option>)}</select></div><div className="scaleup-field"><label className="scaleup-label">File PDF / JPG / PNG (maks. 8 MB)</label><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>setCertFile(e.target.files?.[0]||null)}/></div><Field label="Nomor Sertifikat" value={certNumber} onChange={setCertNumber}/><Field type="date" label="Tanggal Kedaluwarsa" value={certExpiry} onChange={setCertExpiry}/></div><button type="button" className="scaleup-primary" disabled={busy||!recordForCertificate||!certFile} onClick={()=>void action(async()=>{const form=new FormData();form.append('file',certFile!);form.append('category','certificate');form.append('record_id',recordForCertificate);form.append('certificate_number',certNumber);if(certExpiry)form.append('expiration_date',certExpiry);await harmonyFetch('/api/scaleup/documents',{method:'POST',body:form})},'Sertifikat tersimpan secara privat.')}>Unggah Sertifikat</button>
    </section>}
    {tab==='configuration'&&hr&&<section className="scaleup-panel"><div className="scaleup-panel-header"><div><span className="scaleup-section-no">ADMINISTRATOR ONLY</span><h2>Workflow Configuration</h2></div><Settings2 size={20}/></div><p className="scaleup-caption">Default mandatory adalah Wadir Sumber Daya dan Kelembagaan serta Wadir Keuangan. Perubahan kebijakan berlaku untuk pengajuan baru dan tercatat sebagai versi baru.</p><strong>Policy aktif: versi {policyVersion}</strong>
      {policy&&<div className="scaleup-policy"><label><input type="checkbox" checked={policy.mandatory_roles.includes('wadirsdk')} onChange={e=>setPolicy({...policy,mandatory_roles:e.target.checked?[...policy.mandatory_roles,'wadirsdk'] : policy.mandatory_roles.filter(x=>x!=='wadirsdk')})}/> Wadir Sumber Daya dan Kelembagaan wajib</label><label><input type="checkbox" checked={policy.mandatory_roles.includes('finance')} onChange={e=>setPolicy({...policy,mandatory_roles:e.target.checked?[...policy.mandatory_roles,'finance']:policy.mandatory_roles.filter(x=>x!=='finance')})}/> Wadir Keuangan wajib</label><label><input type="checkbox" checked={policy.mandatory_roles.includes('director')} onChange={e=>setPolicy({...policy,mandatory_roles:e.target.checked?[...policy.mandatory_roles,'director']:policy.mandatory_roles.filter(x=>x!=='director')})}/> Direktur wajib</label><label><input type="checkbox" checked={policy.merge_supervisor_executive} onChange={e=>setPolicy({...policy,merge_supervisor_executive:e.target.checked})}/> Izinkan merge Supervisor ↔ Executive jika individu sama</label><button type="button" disabled={busy} onClick={()=>{if(window.confirm('Perubahan policy akan memengaruhi pengajuan baru. Lanjutkan?'))void action(()=>harmonyFetch('/api/scaleup/config',{method:'POST',body:JSON.stringify({configuration:policy})}),'Versi konfigurasi baru berhasil diterbitkan.')}}>Simpan Versi Policy Baru</button></div>}
      <div className="scaleup-divider"/><h3>Pemetaan Kewenangan Pejabat</h3><p className="scaleup-caption">Tetapkan pejabat dan, bila tersedia, assignment jabatan aktif dari employee master. Pilihan ini menentukan kandidat yang dapat dipilih pemohon. Tidak ada nama default di source.</p>
      <div className="scaleup-form-grid"><div className="scaleup-field"><label className="scaleup-label">Peran Resmi</label><select value={authRole} onChange={e=>setAuthRole(e.target.value)}><option value="wadirsdk">Wadir Sumber Daya dan Kelembagaan</option><option value="finance">Wadir Keuangan</option><option value="director">Direktur</option><option value="supervisor_delegate">Delegasi Atasan</option></select></div><PersonPicker hr label="Nama Pejabat *" value={authPerson} onSelect={setAuthPerson}/>{authRole==='supervisor_delegate'&&<PersonPicker hr label="Pemohon untuk Delegasi *" value={authRequester} onSelect={setAuthRequester}/>}<Field label="Assignment ID (opsional)" value={authAssignment} onChange={setAuthAssignment}/><Field label="Alasan Konfigurasi *" value={authReason} onChange={setAuthReason}/></div>
      <button className="scaleup-primary" type="button" disabled={busy||!authPerson||authReason.trim().length<5} onClick={()=>void action(()=>harmonyFetch('/api/scaleup/authorities',{method:'POST',body:JSON.stringify({role_key:authRole,employee_id:authPerson?.id,requester_id:authRole==='supervisor_delegate'?authRequester?.id:null,assignment_id:authAssignment||null,reason:authReason})}),'Pemetaan kewenangan tersimpan.')}>Tambahkan Pemetaan</button>
      <div className="scaleup-divider"/><h3>Daftar Pejabat Berwenang</h3>{authorities.length===0?<p className="scaleup-empty">Belum ada pemetaan pejabat. Konfigurasikan kedua Wadir sebelum employee mengajukan training.</p>:authorities.map(a=><div className="scaleup-row" key={a.id}><div><strong>{a.employee?.full_name||a.employee_id}</strong><small>{ROLE_LABELS[a.role_key as ScaleupRole]||'Delegasi Supervisor'} · {a.employee?.position||'—'} · {a.is_active?'Aktif':'Nonaktif'}</small></div>{a.is_active&&<button type="button" disabled={busy} onClick={()=>void action(()=>harmonyFetch('/api/scaleup/authorities',{method:'POST',body:JSON.stringify({deactivate_id:a.id})}),'Mapping dinonaktifkan.')}>Nonaktifkan</button>}</div>)}
      <div className="scaleup-divider"/><h3>Laporan dan Anggaran</h3><div className="scaleup-summary-line"><span>Estimasi Training</span><strong>{money(totalBudget)}</strong></div><div className="scaleup-summary-line"><span>Realisasi Training</span><strong>{money(realized)}</strong></div><button type="button" onClick={savedReport}>Ekspor Pengajuan CSV (Excel-compatible)</button>
    </section>}
    <p className="scaleup-footer-note">SCALE UP · HARMONY HRIS · Kebijakan approval berversi · Semua persetujuan tercatat untuk audit.</p>
    {printRequest&&<div id="scaleup-print-sheet"><div className="scaleup-print-header"><Image src="/logo.png" width={65} height={65} alt="Logo Institusi"/><div><strong>FORMULIR PENGAJUAN TRAINING</strong><p>HARMONY — SCALE UP</p></div></div><p>No. Pengajuan: {printRequest.id} · {date(printRequest.submitted_at)}</p><hr/><h3>Informasi Pemohon</h3><p>{printRequest.requester?.full_name} · {printRequest.requester?.employee_number} · {printRequest.requester?.position} · {printRequest.requester?.department}</p><h3>Informasi Training</h3>{([['Judul',printRequest.training.title],['Penyelenggara',printRequest.training.provider],['Tanggal',`${date(printRequest.training.start_date)} – ${date(printRequest.training.end_date)}`],['Lokasi',printRequest.training.location],['Metode',printRequest.training.method],['Tujuan',printRequest.training.objective],['Estimasi Biaya',money(printRequest.total_estimated_budget)]] as string[][]).map(([k,v])=><p key={k}><strong>{k}:</strong> {v||'—'}</p>)}<h3>Persetujuan</h3><div className="scaleup-signatures">{printRequest.stages.map(s=><div key={s.id}><p>{s.label}</p><div className="scaleup-sign-space"/><strong>{s.identity_snapshot?.name||'—'}</strong><small>{s.identity_snapshot?.position||'—'}</small><small>Status: {statusMap[s.status]||s.status} · {date(s.decided_at)}</small></div>)}</div><p className="scaleup-print-foot">Dokumen ini menyediakan ruang tanda tangan basah. Status approved sistem bukan tanda tangan elektronik tersertifikasi.</p></div>}
  </div>
}
function Field({label,value,onChange,type='text',required=false}:{label:string;value:string;onChange:(v:string)=>void;type?:string;required?:boolean}){return <div className="scaleup-field"><label className="scaleup-label">{label}<input className="scaleup-input" type={type} min={type==='number'?'0':undefined} value={value} required={required} onChange={e=>onChange(e.target.value)}/></label></div>}
function TextArea({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div className="scaleup-field scaleup-span"><label className="scaleup-label">{label}<textarea value={value} onChange={e=>onChange(e.target.value)} rows={2}/></label></div>}
function SelectField({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}){return <div className="scaleup-field"><label className="scaleup-label">{label}<select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option value={o} key={o}>{o}</option>)}</select></label></div>}
