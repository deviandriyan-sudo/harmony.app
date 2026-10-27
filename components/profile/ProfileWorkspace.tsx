'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {AlertCircle,BookOpen,Camera,Check,CheckCircle2,ChevronDown,ChevronRight,ClipboardCheck,FileBadge,FileCheck2,FolderLock,GraduationCap,HeartHandshake,IdCard,Info,Landmark,Loader2,Plus,Save,ShieldCheck,Trash2,UploadCloud,UserRound,UsersRound,Wallet} from 'lucide-react'
import {harmonyFetch} from '@/lib/harmony-client'
import {PROFILE_DOC_TYPES,PROFILE_SECTION_KEYS,PROFILE_SECTIONS,type ProfileSection,type ProfileDocCategory} from '@/lib/profile-schema'
import type {PtkpResult} from '@/lib/ptkp'
import {supabase} from '@/lib/supabase'

type Doc={id:string;category:string;original_name:string;mime_type:string;created_at:string}
type PTKP=PtkpResult&{verified:{code:string;annual_amount:number;reviewed_at:string}|null}
type Data={employee:{id:string;full_name:string|null;employee_number:string|null;department:string|null;position:string|null};sections:Record<string,Record<string,string>>;documents:Doc[];ptkp:PTKP}
type WorkspaceSection=ProfileSection|'documents'
const ICONS:Record<WorkspaceSection,typeof UserRound>={identity:IdCard,family:UsersRound,tax_bank:Wallet,emergency:HeartHandshake,education:BookOpen,declaration:ClipboardCheck,documents:FolderLock}
// Distinct icons and color accents let employees recognize sections at a glance.
const SECTION_COLORS:Record<WorkspaceSection,string>={
 identity:'bg-blue-100/90 text-blue-700',family:'bg-violet-100/90 text-violet-700',
 tax_bank:'bg-teal-100/90 text-teal-700',emergency:'bg-rose-100/90 text-rose-700',
 education:'bg-amber-100/90 text-amber-700',declaration:'bg-indigo-100/90 text-indigo-700',
 documents:'bg-sky-100/90 text-sky-700',
}
const DOCUMENT_GROUP_ICONS:Record<string,typeof UserRound>={
 'Foto profil':Camera,'Identitas':IdCard,'Kepesertaan BPJS':HeartHandshake,
 'Pendidikan':GraduationCap,'Administrasi':Wallet,'Keluarga':UsersRound,
 'Lainnya':FolderLock,'Arsip':FileBadge,
}
const REPEATS:Record<string,{label:string;fields:Record<string,string>}>= {
 children_json:{label:'Daftar anak',fields:{name:'Nama lengkap',nik:'NIK',birth:'Tanggal lahir',gender:'Jenis kelamin',occupation:'Pekerjaan/sekolah',fully_dependent:'Ditanggung penuh',has_income:'Memiliki penghasilan',married:'Sudah menikah'}},
 dependents_json:{label:'Tanggungan lain (misal orang tua / mertua)',fields:{name:'Nama lengkap',relation:'Hubungan keluarga',birth:'Tanggal lahir',fully_dependent:'Ditanggung penuh',has_income:'Memiliki penghasilan',married:'Sudah menikah'}},
 beneficiaries_json:{label:'Daftar ahli waris',fields:{name:'Nama lengkap',relation:'Hubungan keluarga',birth:'Tanggal lahir',phone:'Nomor telepon',address:'Alamat'}},
 education_history_json:{label:'Riwayat pendidikan',fields:{level:'Jenjang',major:'Jurusan',institution:'Nama institusi'}}
}
const YESNO=[{value:'',label:'Pilih jawaban'},{value:'yes',label:'Ya'},{value:'no',label:'Tidak'}]
const OPTIONS:Record<string,{value:string;label:string}[]>={
 gender:[{value:'',label:'Pilih jenis kelamin'},{value:'Laki-laki',label:'Laki-laki'},{value:'Perempuan',label:'Perempuan'}],
 marital_status:[{value:'',label:'Pilih status'},{value:'unmarried',label:'Belum menikah'},{value:'married',label:'Menikah'},{value:'divorced',label:'Cerai hidup'},{value:'widowed',label:'Cerai mati'}],
 husband_no_income_proof:[{value:'',label:'Pilih kondisi'},{value:'no',label:'Tidak / tidak ada bukti'},{value:'yes',label:'Ya, ada surat resmi'}],
 combined_spouse_income:[{value:'',label:'Pilih kondisi'},{value:'no',label:'Tidak'},{value:'yes',label:'Ya, penghasilan istri digabung (untuk ditinjau HR)'}],
 fully_dependent:YESNO,has_income:YESNO,married:YESNO
}
const DATE_FIELDS=new Set(['birth_date','married_since','npwp_registered','signed_at','birth'])
const DOC_GROUPS=['Foto profil','Identitas','Kepesertaan BPJS','Pendidikan','Administrasi','Keluarga','Lainnya','Arsip']
const PILL='rounded-2xl border border-white/70 bg-white/50 shadow-[inset_0_1px_1px_rgba(255,255,255,.85),0_9px_26px_rgba(28,63,114,.07)] backdrop-blur-xl'
const FIELD='mt-1.5 w-full rounded-xl border border-white/75 bg-white/65 px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_1px_#fff] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-white/35 disabled:text-slate-600'
function formatMoney(n:number|null){return n===null?'—':new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)}
function parseRows(s:string):Record<string,string>[]{try{const v=JSON.parse(s||'[]');return Array.isArray(v)?v.slice(0,30).filter(x=>x&&typeof x==='object'):[]}catch{return []}}
function GenericInput({field,label,value,onChange,disabled}:{field:string;label:string;value:string;onChange:(v:string)=>void;disabled:boolean}){
 const options=OPTIONS[field]
 return <label className="block min-w-0 text-xs font-semibold text-slate-700">{label}{options?<select disabled={disabled} value={value} onChange={e=>onChange(e.target.value)} className={FIELD}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}{value&&!options.some(o=>o.value===value)&&<option value={value}>{value} (data lama, periksa)</option>}</select>:<input disabled={disabled} type={DATE_FIELDS.has(field)?'date':'text'} value={value} onChange={e=>onChange(e.target.value)} placeholder="Belum diisi" className={FIELD}/>}</label>
}
function Repeat({field,value,onChange,readOnly}:{field:string;value:string;onChange:(v:string)=>void;readOnly:boolean}){
 const meta=REPEATS[field],rows=parseRows(value)
 const save=(newRows:Record<string,string>[])=>onChange(JSON.stringify(newRows))
 return <div className={`sm:col-span-2 ${PILL} p-4`}>
 <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{meta.label}</p><p className="text-xs text-slate-500">{rows.length} data tersimpan{field==='children_json'?' · batas tanggungan pajak maksimum 3 orang, bukan batas jumlah anak':''}</p></div>{!readOnly&&<button type="button" onClick={()=>save([...rows,{}])} disabled={rows.length>=30} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-semibold text-blue-700"><Plus size={15}/>Tambah data</button>}</div>
 {!rows.length&&<p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Belum ada data. Gunakan tombol Tambah data untuk melengkapi.</p>}
 {rows.map((row,index)=><div key={`${field}-${index}`} className="mb-2 rounded-2xl border border-white/80 bg-white/50 p-3"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Data {index+1}</span>{!readOnly&&<button type="button" onClick={()=>save(rows.filter((_,i)=>index!==i))} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><Trash2 size={14}/>Hapus</button>}</div><div className="grid gap-3 sm:grid-cols-2">{Object.entries(meta.fields).map(([k,label])=><GenericInput key={k} field={k} label={label} value={row[k]||''} onChange={v=>save(rows.map((x,i)=>i===index?{...x,[k]:v}:x))} disabled={readOnly}/>)}</div></div>)}
 </div>
}
export function ProfileWorkspace({employeeId,readOnly=false,initialSection='identity'}:{employeeId?:string;readOnly?:boolean;initialSection?:WorkspaceSection}){
 const [data,setData]=useState<Data|null>(null)
 const [active,setActive]=useState<WorkspaceSection>(initialSection)
 const [values,setValues]=useState<Record<string,string>>({})
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const [dirty,setDirty]=useState(false),[message,setMessage]=useState('')
 const [file,setFile]=useState<File|null>(null),[category,setCategory]=useState<ProfileDocCategory>('ktp')
 const [avatarUrl,setAvatarUrl]=useState(''),[livePtkp,setLivePtkp]=useState<PtkpResult|null>(null)
 const [reviewNote,setReviewNote]=useState('')
 const avatarInputRef=useRef<HTMLInputElement|null>(null)
 const [uploadingAvatar,setUploadingAvatar]=useState(false)
 async function load(preserveDraft=false){try{
  setLoading(true)
  const d=await harmonyFetch<Data>(`/api/employee/profile${employeeId?`?employee_id=${encodeURIComponent(employeeId)}`:''}`)
  setData(d);if(!preserveDraft){setValues(d.sections[active]||{});setDirty(false);setLivePtkp(null)}setAvatarUrl('')
  const avatar=d.documents.find(x=>x.category==='avatar')
  if(avatar){try{const x=await harmonyFetch<{url:string}>(`/api/employee/profile/documents?id=${avatar.id}`);setAvatarUrl(x.url)}catch{/* avatar is optional */}}
 }catch(e){setMessage(e instanceof Error?e.message:'Gagal memuat biodata')}finally{setLoading(false)}}
 useEffect(()=>{const timer=window.setTimeout(()=>{void load()},0);return()=>window.clearTimeout(timer)},[employeeId]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{
  if(!data||!dirty||readOnly||(active!=='identity'&&active!=='family'))return
  let stop=false
  const timer=setTimeout(async()=>{try{const preview=await harmonyFetch<{ptkp:PtkpResult}>('/api/employee/profile/ptkp-preview',{method:'POST',body:JSON.stringify({section:active,values})});if(!stop)setLivePtkp(preview.ptkp)}catch{/* PTKP remains a server-validated calculation on save. */}},500)
  return()=>{stop=true;clearTimeout(timer)}
 },[active,values,dirty,readOnly,data])
 const progress=useMemo(()=>!data?0:Math.round(PROFILE_SECTION_KEYS.filter(k=>Object.values(data.sections[k]||{}).some(Boolean)).length/PROFILE_SECTION_KEYS.length*100),[data])
 const ptkp=(active==='family'||active==='identity')&&livePtkp?livePtkp:data?.ptkp
 function edit(key:string,v:string){setDirty(true);setValues(old=>({...old,[key]:v}))}
 function select(section:WorkspaceSection){if(dirty&&!window.confirm('Perubahan belum disimpan. Pindah kategori tanpa menyimpan?'))return;setActive(section);setValues(section==='documents'?{}:data?.sections[section]||{});setDirty(false);setLivePtkp(null);setMessage('')}
 async function save(){if(active==='documents'||!dirty)return;try{setBusy(true);const fields=PROFILE_SECTIONS[active].fields as Record<string,string>;const clean=Object.fromEntries(Object.entries(values).filter(([key])=>key!=='tax_status'&&Object.hasOwn(fields,key)));await harmonyFetch('/api/employee/profile',{method:'PATCH',body:JSON.stringify({section:active,values:clean})});await load();setMessage('Data kategori berhasil disimpan.')}catch(e){setMessage(e instanceof Error?e.message:'Tidak dapat menyimpan')}finally{setBusy(false)}}
 async function uploadDocument(chosen:File,documentCategory:ProfileDocCategory){
  if(chosen.size>8*1024*1024)throw new Error('Ukuran maksimum file adalah 8 MB.')
  if(documentCategory==='avatar'&&!['image/jpeg','image/png','image/webp'].includes(chosen.type))throw new Error('Foto profil harus berupa JPG, PNG, atau WEBP.')
  const session=(await supabase.auth.getSession()).data.session
  if(!session)throw new Error('Silakan login kembali.')
  const form=new FormData();form.set('file',chosen);form.set('category',documentCategory)
  const result=await fetch('/api/employee/profile/documents',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},body:form})
  const body=await result.json().catch(()=>({message:'Tidak dapat memproses jawaban server.'}))
  if(!result.ok)throw new Error(body.message||'Upload gagal')
  await load(documentCategory==='avatar')
  if(documentCategory==='avatar')window.dispatchEvent(new Event('harmony:avatar-updated'))
 }
 async function upload(){if(!file)return;try{
  setBusy(true)
  await uploadDocument(file,category)
  setFile(null);setMessage(category==='avatar'?'Foto profil berhasil diperbarui.':'Dokumen berhasil disimpan secara privat.')
 }catch(e){setMessage(e instanceof Error?e.message:'Upload gagal')}finally{setBusy(false)}}
 async function updateAvatar(chosen:File|undefined){if(!chosen||readOnly)return
  try{setUploadingAvatar(true);setMessage('');await uploadDocument(chosen,'avatar');setMessage('Foto profil berhasil diperbarui. Foto baru juga tampil di sidebar.')}
  catch(e){setMessage(e instanceof Error?e.message:'Gagal memperbarui foto profil.')}
  finally{setUploadingAvatar(false);if(avatarInputRef.current)avatarInputRef.current.value=''}
 }
 async function openDoc(id:string){try{const d=await harmonyFetch<{url:string}>(`/api/employee/profile/documents?id=${id}`);window.open(d.url,'_blank','noopener,noreferrer')}catch(e){setMessage(e instanceof Error?e.message:'Tidak dapat membuka dokumen')}}
 async function verifyPTKP(){if(!employeeId||!data?.ptkp)return;try{
  setBusy(true);await harmonyFetch('/api/hr/employee-ptkp',{method:'POST',body:JSON.stringify({employee_id:employeeId,tax_year:data.ptkp.year,fingerprint:data.ptkp.fingerprint,note:reviewNote})})
  await load();setMessage('Status PTKP berhasil diverifikasi HR. Payroll tidak diubah.')
 }catch(e){setMessage(e instanceof Error?e.message:'Verifikasi gagal')}finally{setBusy(false)}}
 if(loading)return <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-600"><Loader2 size={18} className="animate-spin"/>Memuat akun karyawan...</div>
 if(!data)return <div className="rounded-2xl bg-rose-50 p-5 text-rose-700">{message||'Profil tidak tersedia.'}</div>
 return <div className="space-y-4 pb-12">
  <header className="relative overflow-hidden rounded-[26px] border border-white/70 bg-[linear-gradient(118deg,rgba(38,103,193,.85),rgba(108,166,232,.70),rgba(183,209,250,.64))] p-5 text-white shadow-[inset_0_2px_3px_rgba(255,255,255,.48),0_16px_34px_rgba(20,60,121,.13)] backdrop-blur-2xl sm:p-6">
   <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/80"/>
   <div className="flex flex-wrap items-center gap-4">
    <div className="relative shrink-0">
     <div className="grid h-[82px] w-[82px] place-items-center overflow-hidden rounded-[24px] border-2 border-white/80 bg-white/25 text-white shadow-[0_8px_22px_rgba(25,68,129,.22)] sm:h-[90px] sm:w-[90px]">
      {avatarUrl?<Image unoptimized src={avatarUrl} width={90} height={90} alt={`Foto profil ${data.employee.full_name||'karyawan'}`} className="h-full w-full object-cover"/>:<UserRound size={34} aria-hidden="true"/>}
     </div>
     {!readOnly&&<>
      <input ref={avatarInputRef} id="harmony-avatar-picker" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Pilih foto profil" onChange={event=>void updateAvatar(event.currentTarget.files?.[0])}/>
      <button type="button" title="Ganti foto profil" aria-label="Ganti foto profil" onClick={()=>avatarInputRef.current?.click()} disabled={uploadingAvatar} className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-xl border-2 border-white bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60">{uploadingAvatar?<Loader2 size={18} className="animate-spin"/>:<Camera size={18}/>}</button>
     </>}
    </div>
    <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold tracking-wider text-white/90">HARMONY · AKUN KARYAWAN</p><h1 className="mt-1 text-xl font-bold sm:text-2xl">{data.employee.full_name}</h1><p className="text-xs leading-5 text-white/90">{data.employee.employee_number} · {data.employee.department} · {data.employee.position}</p>{!readOnly&&<p className="mt-1.5 flex items-center gap-1 text-xs text-white/90"><Camera size={13}/> Klik ikon kamera untuk {avatarUrl?'mengganti':'mengunggah'} foto</p>}</div>
    <div className="rounded-2xl border border-white/60 bg-white/20 px-4 py-3 text-right"><strong className="text-2xl">{progress}%</strong><p className="text-xs">Kategori terisi</p></div>
   </div>
  </header>
  <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(252px,272px)_minmax(0,1fr)]">
   <nav aria-label="Kategori akun" className={`${PILL} flex h-fit min-w-0 gap-1.5 overflow-x-auto p-2.5 lg:flex-col lg:overflow-visible`}>
    <p className="hidden px-3 py-2 text-[11px] font-bold tracking-wider text-slate-500 lg:block">KATEGORI AKUN</p>
    {[...PROFILE_SECTION_KEYS,'documents' as const].map(key=>{const Icon=ICONS[key],selected=active===key;return <button type="button" key={key} onClick={()=>select(key)} title={key==='documents'?'Dokumen Karyawan':PROFILE_SECTIONS[key].label} aria-current={selected?'page':undefined} className={`group flex min-h-12 shrink-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 lg:w-full lg:min-w-0 ${selected?'border-blue-300/75 bg-blue-600/95 font-semibold text-white shadow-[0_6px_16px_rgba(34,102,200,.20)]':'border-transparent text-slate-700 hover:border-white hover:bg-white/75'}`}>
     <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[11px] ${selected?'bg-white/20 text-white':SECTION_COLORS[key]}`}><Icon size={18} strokeWidth={2.1}/></span>
     <span className="min-w-0 flex-1 whitespace-nowrap text-[13px] leading-snug lg:whitespace-normal lg:break-words">{key==='documents'?'Dokumen Karyawan':PROFILE_SECTIONS[key].label}</span>
     {selected&&<ChevronRight size={15} className="hidden shrink-0 lg:block"/>}
    </button>})}
    {!readOnly&&<Link href="/employee/settings" className="mt-2 hidden min-h-11 items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-xs font-semibold text-blue-700 hover:border-white hover:bg-white/60 lg:flex"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100/80"><ShieldCheck size={17}/></span><span className="min-w-0 flex-1 leading-snug">Pengaturan & Password</span></Link>}
   </nav>
   <div className="min-w-0 space-y-4">
    {active==='documents'?<section className={`${PILL} p-4 sm:p-5`}>
     <div className="mb-4"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><FolderLock size={20} className="text-blue-600"/>Dokumen Karyawan</h2><p className="mt-1 text-xs text-slate-600">Database dokumen utama. Unggah sesuai jenis dokumen; hanya karyawan bersangkutan dan HR berwenang yang dapat membukanya.</p></div>
     {!readOnly&&<div className="mb-5 grid gap-3 rounded-2xl border border-white/80 bg-white/45 p-4 sm:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_auto] sm:items-end"><label className="text-xs font-semibold text-slate-700">Jenis dokumen<select value={category} onChange={e=>{setCategory(e.target.value as ProfileDocCategory);setFile(null)}} className={FIELD}>{Object.entries(PROFILE_DOC_TYPES).filter(([k])=>!['identity','family','tax_bank','emergency','education','declaration'].includes(k)).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><label className="text-xs font-semibold text-slate-700">Pilih file (maks. 8 MB)<input type="file" key={category} accept={category==='avatar'?'image/jpeg,image/png,image/webp':'.pdf,.jpg,.jpeg,.png,.webp,.docx'} className={`${FIELD} cursor-pointer text-xs`} onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button type="button" onClick={upload} disabled={!file||busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-md disabled:opacity-40"><UploadCloud size={16}/>Upload</button></div>}
     <div className="grid gap-2">{DOC_GROUPS.map(group=>{const items=data.documents.filter(doc=>(PROFILE_DOC_TYPES[doc.category as ProfileDocCategory]?.group||'Lainnya')===group);const GroupIcon=DOCUMENT_GROUP_ICONS[group]||FolderLock;return <details key={group} className="harmony-motion-disclosure group rounded-2xl border border-white/75 bg-white/45 transition open:bg-white/65">
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 focus-visible:outline-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100/85 text-blue-700"><GroupIcon size={18}/></span><span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{group}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${items.length?'bg-emerald-100 text-emerald-700':'bg-white/65 text-slate-500'}`}>{items.length?`${items.length} file`:'Belum ada'}</span><ChevronDown size={16} className="shrink-0 text-slate-500 transition group-open:rotate-180"/></summary>
      <div className="border-t border-white/80 px-3.5 pb-3 pt-2.5">{items.length?<div className="grid gap-2 md:grid-cols-2">{items.map(doc=><button type="button" key={doc.id} onClick={()=>openDoc(doc.id)} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/75 bg-white/70 p-3 text-left hover:bg-white"><FileCheck2 className="shrink-0 text-blue-600" size={18}/><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900">{doc.original_name}</span><span className="text-[11px] text-slate-500">{PROFILE_DOC_TYPES[doc.category as ProfileDocCategory]?.label||doc.category} · {new Date(doc.created_at).toLocaleDateString('id-ID')}</span></span><ChevronRight size={14} className="text-slate-500"/></button>)}</div>:<p className="text-xs text-slate-500">Belum ada dokumen dalam kategori ini. Pilih jenis dokumen di atas untuk mengunggah.</p>}</div>
     </details>})}</div>
    </section>:<section className={`${PILL} p-4 sm:p-5`}><div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/80 pb-4"><div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">{(()=>{const Icon=ICONS[active];return <Icon size={20} className="text-blue-600"/>})()}{PROFILE_SECTIONS[active].label}</h2><p className="mt-1 text-xs text-slate-500">{readOnly?'Detail karyawan, hanya HR yang dapat melihat.':'Isi satu kategori, lalu klik Simpan sebelum pindah.'}</p></div>{!readOnly&&<button type="button" disabled={busy||!dirty} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-45"><Save size={16}/>Simpan kategori</button>}</div>
      <div className="grid gap-4 sm:grid-cols-2">{Object.entries(PROFILE_SECTIONS[active].fields).map(([key,label])=>{
       if(key==='tax_status')return <div key={key} className="sm:col-span-2 rounded-xl border border-amber-200/75 bg-amber-50/65 p-3 text-xs text-amber-900"><b>PTKP lama (arsip):</b> {values.tax_status||'Tidak tersedia'} · Tidak lagi menjadi status otomatis yang digunakan untuk rekomendasi baru.</div>
       if(REPEATS[key])return <Repeat key={key} field={key} value={values[key]||''} onChange={v=>edit(key,v)} readOnly={readOnly}/>
       return <GenericInput key={key} field={key} label={label} value={values[key]||''} onChange={v=>edit(key,v)} disabled={readOnly}/>})}</div>
     </section>}
    {(active==='family'||active==='identity')&&ptkp&&<section className={`${PILL} p-4 sm:p-5`}>
     <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Landmark size={18} className="text-blue-600"/>Perhitungan PTKP Tahun {ptkp.year}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.ptkp.verified&&!dirty?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{data.ptkp.verified&&!dirty?'Terverifikasi HR':'Usulan · perlu verifikasi HR'}</span></div>
     <div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/80 bg-white/60 p-3"><p className="text-xs text-slate-500">Status otomatis</p><b className="mt-1 block text-xl text-blue-700">{ptkp.code||'Belum lengkap'}</b></div><div className="rounded-xl border border-white/80 bg-white/60 p-3"><p className="text-xs text-slate-500">Tanggungan PTKP</p><b className="mt-1 block text-xl text-slate-900">{ptkp.dependentsCount} / 3</b></div><div className="rounded-xl border border-white/80 bg-white/60 p-3"><p className="text-xs text-slate-500">PTKP per tahun</p><b className="mt-1 block text-base text-slate-900">{formatMoney(ptkp.annualAmount)}</b></div></div>
     <p className="mt-3 flex gap-2 text-xs text-slate-600"><Info size={16} className="shrink-0 text-blue-600"/>Penghitungan berdasarkan kondisi per 1 Januari, tanggungan penuh dan peraturan pajak. Usia 18 tahun bukan batas otomatis. Status ini tidak langsung mengubah payroll.</p>
     {(ptkp.warnings.length>0||ptkp.notCounted.length>0)&&<div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/65 p-3 text-xs text-amber-900"><strong className="flex items-center gap-1"><AlertCircle size={15}/>Pemeriksaan data</strong>{[...ptkp.warnings,...ptkp.notCounted].slice(0,12).map((item,i)=><p key={i} className="mt-1">• {item}</p>)}</div>}
     {readOnly&&data.ptkp.code&&<div className="mt-4 rounded-xl border border-white/80 bg-white/55 p-3"><p className="mb-2 text-xs font-semibold text-slate-700">Verifikasi PTKP oleh HR</p>{data.ptkp.verified?<p className="mb-2 text-xs text-emerald-700"><CheckCircle2 size={14} className="mr-1 inline"/>Diverifikasi pada {new Date(data.ptkp.verified.reviewed_at).toLocaleDateString('id-ID')}.</p>:null}<textarea value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Catatan hasil pemeriksaan dokumen dan tanggungan (minimal 10 karakter)" rows={2} className={`${FIELD} resize-y`}/><button type="button" onClick={verifyPTKP} disabled={busy||reviewNote.trim().length<10||data.ptkp.unresolvedCount>0} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><Check size={15}/>Verifikasi PTKP</button></div>}
    </section>}
   </div>
  </div>
  {message&&<p role="status" className="rounded-xl border border-white/75 bg-white/75 p-3 text-sm text-slate-800">{message}</p>}
 </div>
}
