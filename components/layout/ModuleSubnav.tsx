'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'
import {
  Archive, BadgeCheck, CalendarDays, ChevronDown, ClipboardCheck, Clock3,
  CreditCard, Download, FileClock, FileText, FolderLock, History, LayoutDashboard,
  ListChecks, LockKeyhole, Settings, ShieldCheck, Upload, UserCheck, Users, WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { isValidAttendancePeriod } from '@/lib/use-attendance-period'
import { resolveDetailTabs, resolveModule, routeMatches, type NavigationRole, type NavigationTab } from '@/lib/navigation'

// Icons are purely presentational: the canonical route registry remains in lib/navigation.ts.
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

function TabRow({ tabs, pathname, secondary = false }: { tabs: NavigationTab[]; pathname: string; secondary?: boolean }) {
  const router = useRouter()
  function keepAttendancePeriod(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!pathname.startsWith('/hr/attendance') || !href.startsWith('/hr/attendance')) return
    const period = new URLSearchParams(window.location.search).get('period')
    if (!isValidAttendancePeriod(period)) return
    event.preventDefault()
    router.push(`${href}?period=${encodeURIComponent(period!)}`)
  }
  const best = tabs.filter(t => (t.activePrefixes || [t.href]).some(prefix => routeMatches(pathname, prefix)))
    .sort((a,b) => Math.max(...(b.activePrefixes || [b.href]).map(p => p.length)) - Math.max(...(a.activePrefixes || [a.href]).map(p => p.length)))[0]?.href

  // Show three frequently used destinations plus the active tab. Keep every other
  // destination available via an accessible disclosure instead of a second long row.
  const first = tabs.slice(0, 3)
  const activeExtra = tabs.find(t => t.href === best && !first.some(x => x.href === t.href))
  const visible = activeExtra ? [...first, activeExtra] : tabs.slice(0, 4)
  const overflow = tabs.filter(t => !visible.some(v => v.href === t.href))
  const activeClass = secondary ? 'harmony-tab-active-secondary' : 'harmony-tab-active'

  function tabLink(tab: NavigationTab, dropdown = false) {
    const Icon = tabIcons[tab.title] || FileText
    const active = best === tab.href
    return <Link key={tab.href} href={tab.href} onClick={event => {
      keepAttendancePeriod(event, tab.href)
      if (dropdown) event.currentTarget.closest('details')?.removeAttribute('open')
    }} aria-current={active ? 'page' : undefined}
      className={`harmony-module-tab ${dropdown ? 'harmony-module-tab-menu' : ''} ${active ? activeClass : ''} inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`}>
      <Icon size={15} strokeWidth={2} aria-hidden="true" />{tab.title}
    </Link>
  }

  return <div className={`harmony-subnav-row flex min-w-0 items-center gap-2 ${secondary ? 'border-t border-slate-200/45 pt-2' : ''}`}>
    <nav aria-label={secondary ? 'Halaman modul' : 'Navigasi modul'} className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain py-0.5">
      {visible.map(tab => tabLink(tab))}
    </nav>
    {overflow.length > 0 && <details className="harmony-subnav-more relative shrink-0">
      <summary className="harmony-module-more inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500">
        Lainnya <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className="harmony-subnav-menu absolute right-0 top-[calc(100%+6px)] z-50 flex min-w-[194px] flex-col gap-1 rounded-2xl border border-white/80 p-1.5 shadow-lg" aria-label="Halaman lainnya">
        {overflow.map(tab => tabLink(tab, true))}
      </div>
    </details>}
  </div>
}

export function ModuleSubnav({ role }: { role: NavigationRole }) {
  const pathname = usePathname()
  const activeModule = resolveModule(role, pathname)
  if (!activeModule) return null
  const details = resolveDetailTabs(role, pathname)
  return <div className="harmony-module-subnav sticky top-[70px] z-20 mx-3 mt-3 rounded-[18px] border border-white/75 bg-white/65 p-2 shadow-[0_7px_25px_rgba(58,72,96,.06)] backdrop-blur-2xl sm:mx-5 lg:top-0 lg:mx-6" aria-label={activeModule.title}>
    <TabRow pathname={pathname} tabs={[...activeModule.tabs]} />
    {details.length > 0 && <div className="mt-1.5"><TabRow pathname={pathname} tabs={details} secondary /></div>}
  </div>
}
