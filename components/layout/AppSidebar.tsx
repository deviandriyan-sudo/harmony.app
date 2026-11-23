'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, LogOut, Pin, PinOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { clearRemedUiSession } from '@/lib/remed-session-client'
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
  const profilePhoto = useEmployeeAvatar(!userRole.toLowerCase().includes('finance'))

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
      clearRemedUiSession()
      sessionStorage.clear()
      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      localStorage.removeItem('harmony_user')
      localStorage.removeItem('remed_user')
      clearRemedUiSession()
      sessionStorage.clear()
      router.replace('/login')
      router.refresh()
    } finally { setLoggingOut(false) }
  }

  const sidebar = <aside className={`harmony-sidebar-shell harmony-motion-rail ${mobile ? 'harmony-sidebar-mobile' : ''} ${pinned && !mobile ? 'harmony-sidebar-pinned' : ''}`} aria-label="Navigasi HARMONY">
    <div className="harmony-sidebar-panel harmony-unslop-sidebar flex h-full min-h-0 flex-col overflow-hidden rounded-[16px]">
      <header className="harmony-sidebar-header flex h-16 shrink-0 items-center gap-2 border-b px-3">
        <div className="harmony-logo-glass flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border">
          <Image src={logoSrc} alt="Logo Politeknik" width={32} height={32} className="h-8 w-8 object-contain" priority />
        </div>
        <div className="harmony-side-detail min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-[15px] font-semibold harmony-text-primary">{title}</p>
          <p className="truncate text-[11px] harmony-text-muted">Integrated HR Platform</p>
        </div>
        {!mobile && <button type="button" onClick={togglePinned} className="harmony-side-detail rounded-lg p-1.5 text-slate-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-blue-500" title={pinned ? 'Lepas pin sidebar' : 'Sematkan sidebar'} aria-label={pinned ? 'Lepas pin sidebar' : 'Sematkan sidebar'} aria-pressed={pinned}>
          {pinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>}
      </header>

      <div className="harmony-sidebar-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        <p className="harmony-side-detail mb-2 px-3 text-[12px] font-medium harmony-text-muted">{userRole.toLowerCase().includes('finance') ? 'Finance' : userRole.toLowerCase().includes('hr') ? 'HR Workspace' : 'Karyawan'}</p>
        <nav className="flex flex-col gap-1" aria-label="Menu utama">
          {menu.map(item => {
            const active = isNavigationActive(pathname, item)
            const Icon = item.icon
            return <Link key={item.href} href={item.href} aria-label={item.title} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={`harmony-nav-item harmony-motion-nav ${active ? 'harmony-nav-active' : ''} ${item.remed ? 'harmony-nav-remed' : ''} group flex h-10 items-center gap-2 rounded-[9px] px-2 harmony-text-secondary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-blue-500`}>
              <span className={`harmony-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]`}><Icon size={17} strokeWidth={1.75} /></span>
              <span className={`harmony-side-detail min-w-0 flex-1 truncate text-[13px] font-medium`}>{item.title}</span>
            </Link>
          })}
        </nav>
      </div>

      <footer className="harmony-sidebar-footer shrink-0 border-t px-2 py-3">
        <div className="flex min-h-[48px] items-center gap-[11px] px-[9px]" title={`${userName} · ${userRole}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border bg-slate-900 text-[11px] font-semibold text-white">{profilePhoto?<Image unoptimized src={profilePhoto} width={39} height={39} alt={`Foto profil ${userName}`} className="h-full w-full object-cover"/>:getInitials(userName)}</div>
          <div className="harmony-side-detail min-w-0 flex-1"><p className="truncate text-[12px] font-medium harmony-text-primary">{userName}</p><p className="truncate text-[11px] harmony-text-muted">{userRole}</p></div>
        </div>
        <button type="button" onClick={handleLogout} disabled={loggingOut} title="Keluar" aria-label="Keluar"
          className="harmony-logout mt-2 flex h-10 w-full items-center gap-2 rounded-[9px] border px-3 transition-colors focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50">
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
