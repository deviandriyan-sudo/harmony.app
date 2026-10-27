'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, LogOut, Pin, PinOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { isNavigationActive, type NavigationItem } from '@/lib/navigation'
import { useEmployeeAvatar } from '@/components/profile/useEmployeeAvatar'

type Props = {
  menu: NavigationItem[]
  title?: string
  userName?: string
  userRole?: string
  logoSrc?: string
  onNavigate?: () => void
  mobile?: boolean
}

export function AppSidebar({ menu, title = 'HARMONY', userName = 'HARMONY User', userRole = 'Employee', logoSrc = '/logo.png', onNavigate, mobile = false }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const profilePhoto = useEmployeeAvatar()

  // Portal the fixed desktop rail above page stacking contexts; the shared
  // workspace follows its current width through CSS during expand/collapse.
  useEffect(() => { const timer=window.setTimeout(()=>setPortalReady(true),0);return()=>window.clearTimeout(timer) }, [])

  useEffect(() => {
    if (mobile) return
    try { const saved = localStorage.getItem('harmony-sidebar-pinned') === 'true'; queueMicrotask(() => setPinned(saved)) } catch { /* private browsing */ }
  }, [mobile])
  function togglePinned() {
    const next = !pinned
    setPinned(next)
    try { localStorage.setItem('harmony-sidebar-pinned', String(next)) } catch { /* private browsing */ }
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('harmony_user')
      localStorage.removeItem('remed_user')
      sessionStorage.clear()
      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      localStorage.removeItem('harmony_user')
      localStorage.removeItem('remed_user')
      sessionStorage.clear()
      window.location.href = '/login'
    } finally { setLoggingOut(false) }
  }

  const sidebar = <aside className={`harmony-sidebar-shell harmony-motion-rail ${mobile ? 'harmony-sidebar-mobile' : ''} ${pinned && !mobile ? 'harmony-sidebar-pinned' : ''}`} aria-label="Navigasi HARMONY">
    <div className="harmony-sidebar-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[25px]">
      <header className="harmony-sidebar-header flex h-[72px] shrink-0 items-center gap-2 border-b px-[13px]">
        <div className="harmony-logo-glass flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[15px] border">
          <Image src={logoSrc} alt="Logo Politeknik" width={36} height={36} className="h-9 w-9 object-contain" priority />
        </div>
        <div className="harmony-side-detail min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">{title}</p>
          <p className="truncate text-[10px] text-slate-500">Integrated HR Platform</p>
        </div>
        {!mobile && <button type="button" onClick={togglePinned} className="harmony-side-detail rounded-lg p-1.5 text-slate-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-blue-500" title={pinned ? 'Lepas pin sidebar' : 'Sematkan sidebar'} aria-label={pinned ? 'Lepas pin sidebar' : 'Sematkan sidebar'} aria-pressed={pinned}>
          {pinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>}
      </header>

      <div className="harmony-sidebar-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[9px] py-3">
        <p className="harmony-side-detail mb-2 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{userRole.toLowerCase().includes('finance') ? 'Finance' : userRole.toLowerCase().includes('hr') ? 'HR Workspace' : 'Karyawan'}</p>
        <nav className="flex flex-col gap-1" aria-label="Menu utama">
          {menu.map(item => {
            const active = isNavigationActive(pathname, item)
            const Icon = item.icon
            return <Link key={item.href} href={item.href} aria-label={item.title} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={`harmony-nav-item harmony-motion-nav ${active ? 'harmony-nav-active' : ''} ${item.remed ? 'harmony-nav-remed' : ''} group flex h-[49px] items-center gap-[11px] rounded-[15px] px-[9px] text-slate-700 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-blue-500`}>
              <span className={`harmony-nav-icon flex h-[39px] w-[39px] shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white/10 text-white' : item.remed ? 'bg-emerald-50 text-emerald-700' : 'bg-white/65 text-slate-600 group-hover:text-blue-600'}`}><Icon size={19} strokeWidth={2} /></span>
              <span className={`harmony-side-detail min-w-0 flex-1 truncate text-[13px] font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>{item.title}</span>
            </Link>
          })}
        </nav>
      </div>

      <footer className="harmony-sidebar-footer shrink-0 border-t px-[9px] py-3">
        <div className="flex min-h-[48px] items-center gap-[11px] px-[9px]" title={`${userName} · ${userRole}`}>
          <div className="flex h-[39px] w-[39px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/70 bg-slate-900 text-[11px] font-bold text-white">{profilePhoto?<Image unoptimized src={profilePhoto} width={39} height={39} alt={`Foto profil ${userName}`} className="h-full w-full object-cover"/>:getInitials(userName)}</div>
          <div className="harmony-side-detail min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-900">{userName}</p><p className="truncate text-[11px] text-slate-500">{userRole}</p></div>
        </div>
        <button type="button" onClick={handleLogout} disabled={loggingOut} title="Keluar" aria-label="Keluar"
          className="harmony-logout mt-2 flex h-11 w-full items-center gap-[11px] rounded-[14px] border px-[18px] text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50">
          {loggingOut ? <Loader2 size={19} className="shrink-0 animate-spin" /> : <LogOut size={19} className="shrink-0" />}
          <span className="harmony-side-detail text-xs font-semibold">{loggingOut ? 'Keluar...' : 'Keluar'}</span>
        </button>

      </footer>
    </div>
  </aside>

  // Keep the same markup for SSR, then move it above page-level stacking
  // contexts after hydration. Mobile drawers remain inside their own overlay.
  return !mobile && portalReady ? createPortal(sidebar, document.body) : sidebar
}

export default AppSidebar
function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)
  return words.length > 1 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : (words[0] || 'U').slice(0, 2).toUpperCase()
}
