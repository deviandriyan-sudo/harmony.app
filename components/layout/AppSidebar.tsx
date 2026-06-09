'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ChevronRight,
  Loader2,
  LogOut,
  ShieldCheck,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type SidebarMenuItem = {
  title: string
  href: string
  icon: React.ElementType
  subtitle?: string
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
  userName = 'Devan Andriyan',
  userRole = 'HR Administrator',
  logoSrc = '/logo.png',
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [loggingOut, setLoggingOut] = useState(false)

  function isActive(href: string) {
    if (href === pathname) return true
    if (href !== '/' && pathname.startsWith(href)) return true
    return false
  }

  async function handleLogout() {
    if (loggingOut) return

    setLoggingOut(true)

    try {
      await supabase.auth.signOut()

      if (typeof window !== 'undefined') {
        localStorage.removeItem('harmony_user')
        sessionStorage.clear()
      }

      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)

      if (typeof window !== 'undefined') {
        localStorage.removeItem('harmony_user')
        sessionStorage.clear()
        window.location.href = '/login'
      }
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <aside className="flex h-screen w-[280px] max-w-[86vw] shrink-0 flex-col border-r border-black/5 bg-[#f7f7f8] px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex h-full flex-col overflow-hidden rounded-[26px] border border-black/5 bg-[#fbfbfc] shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:rounded-[28px]">
        <div className="border-b border-black/5 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <Image
                src={logoSrc}
                alt="HARMONY Logo"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
                priority
              />
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
                  {title}
                </h1>

                <span className="text-[#007aff]">
                  ✣
                </span>
              </div>

              <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-[#6e6e73]">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-black/5 bg-[#f4f4f6] p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-sm font-bold text-white">
                {getInitials(userName)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[#1d1d1f]">
                  {userName}
                </p>

                <p className="truncate text-[12px] text-[#6e6e73]">
                  {userRole}
                </p>
              </div>
            </div>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-100 bg-white px-3 py-2 text-[12px] font-semibold text-green-700 shadow-sm">
              <ShieldCheck size={14} />
              Secure workspace
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8e8e93]">
            Navigation
          </p>

          <nav className="space-y-1.5">
            {menu.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={[
                    'group flex items-center gap-3 rounded-[22px] px-3 py-2.5 transition-all duration-200',
                    active
                      ? 'bg-[#1d1d1f] text-white shadow-[0_10px_28px_rgba(15,23,42,0.18)]'
                      : 'text-[#1d1d1f] hover:bg-white hover:shadow-sm',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition',
                      active
                        ? 'bg-white/12 text-white'
                        : 'bg-[#eef1f5] text-[#3a3a3c] group-hover:bg-[#e8f2ff] group-hover:text-[#007aff]',
                    ].join(' ')}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        'truncate text-[14px] font-semibold',
                        active ? 'text-white' : 'text-[#1d1d1f]',
                      ].join(' ')}
                    >
                      {item.title}
                    </p>

                    {item.subtitle && (
                      <p
                        className={[
                          'truncate text-[12px]',
                          active ? 'text-white/70' : 'text-[#7c7c80]',
                        ].join(' ')}
                      >
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  <ChevronRight
                    size={16}
                    className={active ? 'text-white/70' : 'text-[#b0b0b5]'}
                  />
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-black/5 px-4 py-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-black/5 bg-white px-4 py-3 text-[14px] font-medium text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? (
              <>
                <Loader2 size={16} className="animate-spin text-red-500" />
                Keluar...
              </>
            ) : (
              <>
                <LogOut size={16} className="text-red-500" />
                Keluar
              </>
            )}
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

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}