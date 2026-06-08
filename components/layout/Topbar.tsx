'use client'

import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase'

type TopbarProps = {
  title: string
  description?: string
  badge?: string
}

type NotificationLog = {
  id: string

  recipient_email: string
  recipient_name?: string | null
  recipient_user_id?: string | null
  recipient_employee_id?: string | null

  notification_type: string
  notification_title: string
  notification_message: string

  related_module?: string | null
  related_table?: string | null
  related_id?: string | null

  email_subject?: string | null
  email_status?: string | null
  email_provider?: string | null
  email_provider_id?: string | null
  email_error?: string | null

  metadata?: Record<string, any> | null

  sent_at?: string | null
  read_at?: string | null
  created_at?: string | null
}

export function Topbar({
  title,
  description,
  badge = 'HARMONY System',
}: TopbarProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const [currentEmail, setCurrentEmail] = useState('')
  const [notifications, setNotifications] = useState<NotificationLog[]>([])

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.read_at).length
  }, [notifications])

  useEffect(() => {
    fetchCurrentUserAndNotifications()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  async function fetchCurrentUserAndNotifications() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData.user?.email) {
        setCurrentEmail('')
        setNotifications([])
        setIsLoading(false)
        return
      }

      const email = userData.user.email.trim().toLowerCase()

      setCurrentEmail(email)

      await fetchNotifications(email)
    } catch (error: any) {
      console.error(error)
      setErrorMessage(
        error?.message || 'Gagal memuat notifikasi. Silakan refresh halaman.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchNotifications(email = currentEmail) {
    if (!email) return

    setErrorMessage('')

    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('recipient_email', email)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error(error)
      setErrorMessage(error.message)
      return
    }

    setNotifications((data || []) as NotificationLog[])
  }

  async function handleToggleNotification() {
    const nextOpen = !isOpen

    setIsOpen(nextOpen)

    if (nextOpen && currentEmail) {
      setIsLoading(true)
      await fetchNotifications(currentEmail)
      setIsLoading(false)
    }
  }

  async function handleMarkAsRead(notification: NotificationLog) {
    if (notification.read_at) {
      openNotificationAction(notification)
      return
    }

    setIsMarking(true)

    const { error } = await supabase
      .from('notification_logs')
      .update({
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notification.id)

    if (error) {
      console.error(error)
      setErrorMessage(error.message)
      setIsMarking(false)
      return
    }

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              read_at: new Date().toISOString(),
            }
          : item
      )
    )

    setIsMarking(false)
    openNotificationAction(notification)
  }

  async function handleMarkAllAsRead() {
    if (!currentEmail || unreadCount === 0) return

    setIsMarking(true)
    setErrorMessage('')

    const { error } = await supabase
      .from('notification_logs')
      .update({
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('recipient_email', currentEmail)
      .is('read_at', null)

    if (error) {
      console.error(error)
      setErrorMessage(error.message)
      setIsMarking(false)
      return
    }

    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: item.read_at || new Date().toISOString(),
      }))
    )

    setIsMarking(false)
  }

  function openNotificationAction(notification: NotificationLog) {
    const actionUrl =
      notification.metadata?.action_url ||
      notification.metadata?.actionUrl ||
      null

    if (!actionUrl || typeof actionUrl !== 'string') return

    window.location.href = actionUrl
  }

  function getRelativeTime(value?: string | null) {
    if (!value) return '-'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '-'

    const diffMs = Date.now() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Baru saja'
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`
    if (diffHours < 24) return `${diffHours} jam lalu`
    if (diffDays < 7) return `${diffDays} hari lalu`

    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f5f5f7]/85 backdrop-blur-2xl">
      <div className="flex min-h-[116px] flex-col gap-5 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-semibold text-[#6e6e73] shadow-sm">
            <Sparkles size={14} className="text-[#007aff]" />
            {badge}
          </div>

          <h1 className="truncate text-[30px] font-semibold tracking-[-0.04em] text-[#1d1d1f]">
            {title}
          </h1>

          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-12 min-w-0 items-center gap-3 rounded-[20px] border border-black/5 bg-white px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:shadow-md sm:w-[320px]">
            <Search size={18} className="shrink-0 text-[#86868b]" />

            <input
              type="text"
              placeholder="Search anything..."
              className="w-full bg-transparent text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
            />
          </div>

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={handleToggleNotification}
              className="relative flex h-12 items-center justify-center gap-2 rounded-[20px] border border-black/5 bg-white px-5 text-sm font-semibold text-[#1d1d1f] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f5f5f7] hover:shadow-md"
            >
              <span className="relative">
                <Bell size={18} className="text-[#007aff]" />

                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>

              Notifications
            </button>

            {isOpen && (
              <div className="absolute right-0 top-[58px] z-50 w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                <div className="flex items-start justify-between gap-3 border-b border-black/5 p-5">
                  <div>
                    <h2 className="text-base font-bold tracking-[-0.02em] text-[#1d1d1f]">
                      Notifikasi
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-[#86868b]">
                      {unreadCount > 0
                        ? `${unreadCount} notifikasi belum dibaca`
                        : 'Semua notifikasi sudah dibaca'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      disabled={isMarking || unreadCount === 0}
                      className="inline-flex h-9 items-center gap-1.5 rounded-2xl bg-[#f5f5f7] px-3 text-xs font-bold text-[#1d1d1f] transition hover:bg-[#e8f2ff] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isMarking ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCheck size={14} />
                      )}
                      Dibaca
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#6e6e73] transition hover:bg-[#e8f2ff] hover:text-[#007aff]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-xs leading-5 text-red-600">
                    {errorMessage}
                  </div>
                )}

                <div className="max-h-[420px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center gap-3 p-5 text-sm font-medium text-[#6e6e73]">
                      <Loader2 size={18} className="animate-spin" />
                      Memuat notifikasi...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
                        <Bell size={22} />
                      </div>

                      <h3 className="mt-4 text-sm font-bold text-[#1d1d1f]">
                        Belum ada notifikasi
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-[#86868b]">
                        Notifikasi sistem HARMONY akan muncul di sini.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-black/5">
                      {notifications.map((notification) => {
                        const isUnread = !notification.read_at
                        const actionUrl =
                          notification.metadata?.action_url ||
                          notification.metadata?.actionUrl ||
                          null

                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => handleMarkAsRead(notification)}
                            className={[
                              'block w-full px-5 py-4 text-left transition hover:bg-[#f5f5f7]',
                              isUnread ? 'bg-[#f8fbff]' : 'bg-white',
                            ].join(' ')}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={[
                                  'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                                  isUnread ? 'bg-[#007aff]' : 'bg-transparent',
                                ].join(' ')}
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <h3
                                    className={[
                                      'text-sm leading-5 text-[#1d1d1f]',
                                      isUnread ? 'font-bold' : 'font-semibold',
                                    ].join(' ')}
                                  >
                                    {notification.notification_title}
                                  </h3>

                                  {actionUrl && (
                                    <ExternalLink
                                      size={14}
                                      className="mt-0.5 shrink-0 text-[#86868b]"
                                    />
                                  )}
                                </div>

                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6e6e73]">
                                  {notification.notification_message}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#9a9aa0]">
                                  <span>
                                    {getRelativeTime(notification.created_at)}
                                  </span>

                                  {notification.email_status && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        Email: {notification.email_status}
                                      </span>
                                    </>
                                  )}

                                  {notification.related_module && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        {notification.related_module}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-black/5 bg-[#f5f5f7]/70 px-5 py-3 text-center text-[11px] leading-5 text-[#86868b]">
                  Riwayat diambil dari tabel notification_logs.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar