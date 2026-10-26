'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  Archive, BadgeCheck, CalendarDays, ChevronDown, ClipboardCheck, Clock3,
  CreditCard, Download, FileClock, FileText, FolderLock, History, LayoutDashboard,
  ListChecks, LockKeyhole, Settings, ShieldCheck, Upload, UserCheck, Users, WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { isValidAttendancePeriod } from '@/lib/use-attendance-period'
import { resolveDetailTabs, resolveModule, routeMatches, type NavigationRole, type NavigationTab } from '@/lib/navigation'

const tabIcons: Record<string, LucideIcon> = {
  'Data Karyawan': Users, 'Akun & Akses': LockKeyhole, 'Absensi': Clock3,
  'Cuti & Izin': CalendarDays, 'Saldo PHL': WalletCards, 'Kalender': CalendarDays,
  'Ringkasan': LayoutDashboard, 'Review': ClipboardCheck, 'Riwayat': History,
  'Plafond': CreditCard, 'Akses': ShieldCheck, 'Laporan': FileText,
  'Tanda Tangan': BadgeCheck, 'Pengaturan': Settings, 'Notifikasi': ListChecks,
  'System Health': ShieldCheck, 'Biodata Lengkap': Users, 'Dokumen': FolderLock,
  'Pengaturan & Password': Settings, 'Postpone': FileClock, 'PHL': WalletCards,
  'Ajukan Klaim': FileText, 'Klaim Saya': Archive, 'Upload': Upload,
  'Data & Review': UserCheck, 'Export': Download, 'Sync': ListChecks,
  'Audit': ShieldCheck, 'Administrasi': ListChecks, 'Siklus Cuti': CalendarDays,
  'Pengajuan': ClipboardCheck,
}

function TabRow({tabs,pathname,secondary=false}:{tabs:NavigationTab[];pathname:string;secondary?:boolean}){
  const router=useRouter()
  const anchor=useRef<HTMLButtonElement>(null)
  const menu=useRef<HTMLDivElement>(null)
  const [opened,setOpened]=useState(false)
  const [rect,setRect]=useState({top:0,left:0,width:228,maxHeight:320})
  function keepAttendancePeriod(event:MouseEvent<HTMLAnchorElement>,href:string){
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
    if(!pathname.startsWith('/hr/attendance')||!href.startsWith('/hr/attendance'))return
    const period=new URLSearchParams(window.location.search).get('period')
    if(!isValidAttendancePeriod(period))return
    event.preventDefault();router.push(`${href}?period=${encodeURIComponent(period!)}`)
  }
  const best=tabs.filter(t=>(t.activePrefixes||[t.href]).some(p=>routeMatches(pathname,p)))
    .sort((a,b)=>Math.max(...(b.activePrefixes||[b.href]).map(p=>p.length))-Math.max(...(a.activePrefixes||[a.href]).map(p=>p.length)))[0]?.href
  const first=tabs.slice(0,3)
  const extra=tabs.find(t=>t.href===best&&!first.some(x=>x.href===t.href))
  const visible=extra?[...first,extra]:tabs.slice(0,4)
  const overflow=tabs.filter(t=>!visible.some(v=>v.href===t.href))
  const activeClass=secondary?'harmony-tab-active-secondary':'harmony-tab-active'

  useEffect(() => {
    const closeOtherPopover = () => setOpened(false)
    window.addEventListener('harmony:close-popovers', closeOtherPopover)
    return () => window.removeEventListener('harmony:close-popovers', closeOtherPopover)
  }, [])
  useEffect(()=>{
    if(!opened)return
    function position(){const r=anchor.current?.getBoundingClientRect();if(!r)return
      const width=Math.min(260,window.innerWidth-24)
      setRect({top:Math.min(r.bottom+8,window.innerHeight-100),left:Math.max(12,Math.min(r.right-width,window.innerWidth-width-12)),width,maxHeight:Math.max(100,window.innerHeight-r.bottom-22)})
    }
    function outside(e:PointerEvent){if(!anchor.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))setOpened(false)}
    function keyboard(e:KeyboardEvent){if(e.key==='Escape'){setOpened(false);anchor.current?.focus()}}
    position();window.addEventListener('resize',position);window.addEventListener('scroll',position,true)
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keyboard)
    return()=>{window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keyboard)}
  },[opened])

  function tabLink(tab:NavigationTab,dropdown=false){const Icon=tabIcons[tab.title]||FileText;const active=best===tab.href
    return <Link key={tab.href} href={tab.href} onClick={event=>{keepAttendancePeriod(event,tab.href);if(dropdown)setOpened(false)}} aria-current={active ? 'page' : undefined}
      className={`harmony-module-tab ${dropdown?'harmony-module-tab-menu':''} ${active?activeClass:''} inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`}>
      <Icon size={15} strokeWidth={2} aria-hidden="true"/>{tab.title}</Link>}

  return <div className={`harmony-subnav-row flex min-w-0 items-center gap-2 ${secondary?'border-t border-slate-200/45 pt-2':''}`}>
    <nav aria-label={secondary?'Halaman modul':'Navigasi modul'} className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain py-0.5">{visible.map(tab=>tabLink(tab))}</nav>
    {overflow.length>0&&<>
      <button ref={anchor} type="button" aria-expanded={opened} aria-haspopup="menu" onClick={()=>{ if(!opened) window.dispatchEvent(new Event('harmony:close-popovers')); setOpened(x=>!x)}}
        className="harmony-subnav-more harmony-module-more inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500">
        Lainnya <ChevronDown size={14} aria-hidden="true"/>
      </button>
      {opened&&typeof document!=='undefined'&&createPortal(<div ref={menu} role="menu" aria-label="Menu halaman lainnya"
        className="harmony-subnav-menu harmony-subnav-portal fixed flex flex-col gap-1 overflow-y-auto rounded-2xl border border-white/80 p-1.5 shadow-lg"
        style={{top:rect.top,left:rect.left,width:rect.width,maxHeight:rect.maxHeight,zIndex:1600}}>{overflow.map(tab=>tabLink(tab,true))}</div>,document.body)}
    </>}
  </div>
}
export function ModuleSubnav({role}:{role:NavigationRole}){
  const pathname=usePathname()
  const activeModule=resolveModule(role,pathname)
  if(!activeModule)return null
  const details=resolveDetailTabs(role,pathname)
  return <div className="harmony-module-subnav sticky top-[70px] z-20 mx-3 mt-3 rounded-[18px] border border-white/75 bg-white/65 p-2 shadow-[0_7px_25px_rgba(58,72,96,.06)] backdrop-blur-2xl sm:mx-5 lg:top-0 lg:mx-6" aria-label={activeModule.title}>
    <TabRow key={pathname+"-main"} pathname={pathname} tabs={[...activeModule.tabs]}/>
    {details.length>0&&<div className="mt-1.5"><TabRow key={pathname+"-details"} pathname={pathname} tabs={details} secondary/></div>}
  </div>
}
