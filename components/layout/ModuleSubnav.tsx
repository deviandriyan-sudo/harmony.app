'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'
import { isValidAttendancePeriod } from '@/lib/use-attendance-period'
import { resolveDetailTabs, resolveModule, routeMatches, type NavigationRole, type NavigationTab } from '@/lib/navigation'

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
  // Longest matching route wins: /claims/new must not also mark /claims.
  const best = tabs.filter(t => (t.activePrefixes || [t.href]).some(prefix => routeMatches(pathname, prefix))).sort((a,b) => Math.max(...(b.activePrefixes || [b.href]).map(p => p.length)) - Math.max(...(a.activePrefixes || [a.href]).map(p => p.length)))[0]?.href
  return <nav aria-label={secondary ? 'Halaman modul' : 'Navigasi modul'} className={`flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain ${secondary ? 'border-t border-slate-200/45 pt-2' : ''}`}>
    {tabs.map(tab => <Link key={tab.href} href={tab.href} onClick={event => keepAttendancePeriod(event, tab.href)} aria-current={best === tab.href ? 'page' : undefined}
      className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${best === tab.href ? secondary ? 'bg-white/85 text-blue-700 shadow-sm' : 'bg-[#1d1d1f] text-white shadow-sm' : 'text-slate-600 hover:bg-white/75 hover:text-slate-900'}`}>
      {tab.title}
    </Link>)}
  </nav>
}

export function ModuleSubnav({ role }: { role: NavigationRole }) {
  const pathname = usePathname()
  const activeModule = resolveModule(role, pathname)
  if (!activeModule) return null
  const details = resolveDetailTabs(role, pathname)
  return <div className="harmony-module-subnav sticky top-[70px] z-20 lg:top-0 mx-4 mt-3 rounded-[20px] border border-white/75 bg-white/65 p-2.5 shadow-[0_7px_25px_rgba(58,72,96,.06)] backdrop-blur-2xl sm:mx-5 lg:mx-6" aria-label={activeModule.title}>
    <TabRow pathname={pathname} tabs={[...activeModule.tabs]} />
    {details.length > 0 && <div className="mt-2"><TabRow pathname={pathname} tabs={details} secondary /></div>}
  </div>
}
