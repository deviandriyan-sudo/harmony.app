'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Fragment, useState } from 'react'
import { ChevronRight, Loader2, LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type SidebarMenuItem = {
  title: string
  href: string
  icon: React.ElementType
  subtitle?: string
  section?: string
}

type AppSidebarProps = {
  menu?: SidebarMenuItem[]
  title?: string
  subtitle?: string
  userName?: string
  userRole?: string
  logoSrc?: string
  onNavigate?: () => void
}

export function AppSidebar({
  menu = [],
  title = 'HARMONY',
  subtitle = 'Human Attendance & Leave System',
  userName = 'HARMONY User',
  userRole = 'Employee',
  logoSrc = '/logo.png',
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  function isActive(href: string) {
    const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
    const normalizedHref = href.endsWith('/') && href.length > 1 ? href.slice(0, -1) : href

    if (normalizedHref === normalizedPath) return true
    if (normalizedHref !== '/' && normalizedPath.startsWith(`${normalizedHref}/`)) return true
    return false
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      await supabase.auth.signOut()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('harmony_user')
        localStorage.removeItem('remed_user')
        sessionStorage.clear()
      }
      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('harmony_user')
        localStorage.removeItem('remed_user')
        sessionStorage.clear()
        window.location.href = '/login'
      }
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <aside className="harmony-sidebar-shell flex h-screen w-[272px] max-w-[86vw] shrink-0 flex-col px-3 py-3 sm:px-3.5 sm:py-3.5">
      <div className="harmony-sidebar-panel flex h-full flex-col overflow-hidden rounded-[30px]">
        <div className="harmony-sidebar-header border-b px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="harmony-logo-glass flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[17px] border">
              <Image src={logoSrc} alt="HARMONY Logo" width={42} height={42} className="h-10 w-10 object-contain" priority />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-bold tracking-[-0.02em] text-[#17181b]">{title}</h1>
                <span className="text-[#3b82f6]">✣</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#737780]">{subtitle}</p>
            </div>
          </div>

          <div className="harmony-sidebar-user mt-4 rounded-[21px] border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#17181b] text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(15,23,42,.14)]">{getInitials(userName)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[#17181b]">{userName}</p>
                <p className="truncate text-[11px] text-[#737780]">{userRole}</p>
              </div>
            </div>
            <div className="harmony-secure-pill mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
              <ShieldCheck size={12} />
              Secure workspace
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3.5">
          <nav className="space-y-1">
            {menu.map((item, index) => {
              const active = isActive(item.href)
              const Icon = item.icon
              const section = item.section || 'Navigation'
              const previousSection = index > 0 ? (menu[index - 1].section || 'Navigation') : null
              const showSection = index === 0 || section !== previousSection
              const isRemed = section.toLowerCase().includes('re-med') || item.href.startsWith('/remed')

              return (
                <Fragment key={item.href}>
                  {showSection && (
                    <p className={`${index === 0 ? 'mb-2.5' : 'mb-2.5 mt-5'} px-2.5 text-[10px] font-bold uppercase tracking-[0.22em] ${isRemed ? 'text-emerald-700/75' : 'text-[#9599a1]'}`}>
                      {section}
                    </p>
                  )}
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={[
                      'harmony-nav-item group relative flex items-center gap-2.5 overflow-hidden rounded-[18px] px-2.5 py-2 transition-all duration-200',
                      active ? 'harmony-nav-active text-white' : 'text-[#25272c]',
                      isRemed ? 'harmony-nav-remed' : '',
                    ].join(' ')}
                  >
                    {active ? <span className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${isRemed ? 'bg-emerald-400' : 'bg-blue-400'}`} /> : null}
                    <div className={[
                      'harmony-nav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] transition',
                      active
                        ? 'bg-white/[0.10] text-white'
                        : isRemed
                          ? 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
                          : 'bg-[#eef1f5] text-[#4b5058] group-hover:bg-blue-50 group-hover:text-blue-600',
                    ].join(' ')}>
                      <Icon size={17} strokeWidth={2.15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={['truncate text-[13px] font-bold', active ? 'text-white' : 'text-[#25272c]'].join(' ')}>{item.title}</p>
                      {item.subtitle ? <p className={['truncate text-[10.5px]', active ? 'text-white/58' : 'text-[#8a8f98]'].join(' ')}>{item.subtitle}</p> : null}
                    </div>
                    <ChevronRight size={14} className={active ? 'text-white/55' : 'text-[#b1b5bc]'} />
                  </Link>
                </Fragment>
              )
            })}
          </nav>
        </div>

        <div className="harmony-sidebar-footer border-t px-3.5 py-3.5">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="harmony-logout flex w-full items-center justify-center gap-2 rounded-[17px] border px-4 py-2.5 text-[13px] font-semibold text-[#25272c] transition hover:border-red-100 hover:bg-red-50/80 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? <><Loader2 size={15} className="animate-spin text-red-500" />Keluar...</> : <><LogOut size={15} className="text-red-500" />Keluar</>}
          </button>
        </div>
      </div>
    </aside>
  )
}

export default AppSidebar

function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)
  if (words.length === 0) return 'U'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
