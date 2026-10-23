'use client'

import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { supabase } from '@/lib/supabase'
import type {
  HarmonyActionTask,
  HarmonyTaskCenterResponse,
  HarmonyTaskPriority,
  HarmonyTaskScope,
} from '@/types/notificationTask'

type TopbarProps = {
  title: string
  /** Optional compact chrome when the page itself renders a glass hero. */
  compact?: boolean
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

const TASK_REFRESH_MS = 60_000
const TASK_READ_STORAGE_PREFIX = 'harmony-task-read-v1:'

// Task IDs represent live workflow aggregates. Refresh the badge if the aggregate changes.
function taskFingerprint(item: HarmonyActionTask) {
  return [item.id, item.count, item.period_month || '', item.oldest_created_at || ''].join('|')
}

function loadTaskReadState(userId: string): Record<string, string> {
  if (!userId || typeof window === 'undefined') return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TASK_READ_STORAGE_PREFIX + userId) || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([key, value]) => typeof key === 'string' && typeof value === 'string')
        .slice(-500),
    ) as Record<string, string>
  } catch {
    return {}
  }
}

export function Topbar({
  title,
  compact = false,
  description,
  badge = 'HARMONY System',
}: TopbarProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [popoverPosition, setPopoverPosition] = useState({ top: 78, right: 16, maxHeight: 600 })

  function updatePopoverPosition() {
    const anchor = dropdownRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const top = Math.min(rect.bottom + 10, window.innerHeight - 160)
    setPopoverPosition({
      top: Math.max(12, top),
      right: Math.max(12, window.innerWidth - rect.right),
      maxHeight: Math.max(140, window.innerHeight - top - 12),
    })
  }

  const [currentEmail, setCurrentEmail] = useState('')
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [tasks, setTasks] = useState<HarmonyActionTask[]>([])
  const [taskWarning, setTaskWarning] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [readTaskKeys, setReadTaskKeys] = useState<Record<string, string>>({})
  const [showReadTasks, setShowReadTasks] = useState(false)

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const unreadHistoryCount = useMemo(() => {
    return notifications.filter((item) => !item.read_at).length
  }, [notifications])

  const unreadTasks = useMemo(
    () => tasks.filter((item) => !readTaskKeys[taskFingerprint(item)]),
    [tasks, readTaskKeys],
  )
  const visibleTasks = showReadTasks ? tasks : unreadTasks
  const pendingTaskCount = useMemo(
    () => unreadTasks.reduce((sum, item) => sum + Math.max(1, Number(item.count || 1)), 0),
    [unreadTasks],
  )
  const allTaskCount = useMemo(
    () => tasks.reduce((sum, item) => sum + Math.max(1, Number(item.count || 1)), 0),
    [tasks],
  )
  const totalBadgeCount = pendingTaskCount + unreadHistoryCount

  function saveTaskReadState(next: Record<string, string>) {
    if (!currentUserId) return
    setReadTaskKeys(next)
    try {
      window.localStorage.setItem(
        TASK_READ_STORAGE_PREFIX + currentUserId,
        JSON.stringify(Object.fromEntries(Object.entries(next).slice(-500))),
      )
    } catch {
      setErrorMessage('Status task tidak dapat disimpan pada browser ini.')
    }
  }

  function markTaskRead(item: HarmonyActionTask) {
    if (!currentUserId) return
    saveTaskReadState({ ...readTaskKeys, [taskFingerprint(item)]: new Date().toISOString() })
  }

  function markAllTasksRead() {
    if (!currentUserId || unreadTasks.length === 0) return
    const next = { ...readTaskKeys }
    const now = new Date().toISOString()
    for (const item of unreadTasks) next[taskFingerprint(item)] = now
    saveTaskReadState(next)
  }

  useEffect(() => {
    void fetchCurrentUserAndNotifications()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !popoverRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    updatePopoverPosition()
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)

    if (document.querySelector('.harmony-modal-surface')) {
      setIsOpen(false)
      return
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector('.harmony-modal-surface')) setIsOpen(false)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', onEscape)
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    let active = true

    async function silentRefresh() {
      if (!active) return
      await refreshTasksFromCurrentSession(true)
    }

    const timer = window.setInterval(() => {
      void silentRefresh()
    }, TASK_REFRESH_MS)

    function handleFocus() {
      void silentRefresh()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void silentRefresh()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function fetchCurrentUserAndNotifications() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError || !sessionData.session?.user?.email) {
        setCurrentEmail('')
        setCurrentUserId('')
        setReadTaskKeys({})
        setNotifications([])
        setTasks([])
        return
      }

      const email = sessionData.session.user.email.trim().toLowerCase()
      const token = sessionData.session.access_token

      setCurrentEmail(email)
      setCurrentUserId(sessionData.session.user.id)
      setReadTaskKeys(loadTaskReadState(sessionData.session.user.id))

      await Promise.all([
        fetchNotifications(email),
        fetchTasks(token, false),
      ])
    } catch (error: any) {
      console.error(error)
      setErrorMessage(
        error?.message || 'Gagal memuat pusat notifikasi. Silakan refresh halaman.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchNotifications(email = currentEmail) {
    if (!email) return

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

  async function fetchTasks(token: string, silent: boolean) {
    if (!token) return

    if (!silent) setIsRefreshingTasks(true)

    try {
      const response = await fetch('/api/notifications/tasks', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })

      const payload = (await response
        .json()
        .catch(() => null)) as HarmonyTaskCenterResponse | null

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error || 'Task yang belum selesai belum dapat dihitung.',
        )
      }

      setTasks(Array.isArray(payload.tasks) ? payload.tasks : [])
      setTaskWarning(String(payload.warning || '').trim())
    } catch (error: any) {
      console.error('Task center warning:', error)
      if (!silent) {
        setErrorMessage(
          error?.message || 'Gagal memuat task yang perlu ditindaklanjuti.',
        )
      }
    } finally {
      if (!silent) setIsRefreshingTasks(false)
    }
  }

  async function refreshTasksFromCurrentSession(silent = false) {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token || ''
      if (!token) return
      await fetchTasks(token, silent)
    } catch (error) {
      console.error('Task refresh warning:', error)
    }
  }

  async function refreshAll() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const { data } = await supabase.auth.getSession()
      const email = data.session?.user?.email?.trim().toLowerCase() || currentEmail
      const token = data.session?.access_token || ''

      await Promise.all([
        email ? fetchNotifications(email) : Promise.resolve(),
        token ? fetchTasks(token, false) : Promise.resolve(),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  async function handleToggleNotification() {
    const nextOpen = !isOpen
    if (nextOpen) updatePopoverPosition()
    setIsOpen(nextOpen)

    if (nextOpen) {
      await refreshAll()
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
          : item,
      ),
    )

    setIsMarking(false)
    openNotificationAction(notification)
  }

  async function handleMarkAllAsRead() {
    // Acknowledging a task only changes this user's notification badge.
    // It NEVER changes underlying attendance/leave/PHL approval statuses.
    markAllTasksRead()
    if (!currentEmail || unreadHistoryCount === 0) return

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
      })),
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

  function openTask(task: HarmonyActionTask) {
    if (!task.action_url) return
    window.location.href = task.action_url
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
    <header className="harmony-topbar sticky top-0 z-30 border-b">
      <div className={`flex flex-col gap-4 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between ${compact ? "min-h-[72px]" : "min-h-[108px]"}`}>
        <div className={compact ? "sr-only" : "min-w-0"}>
          <div className="harmony-topbar-badge mb-2.5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold text-[#747982]">
            <Sparkles size={14} className="text-[#007aff]" />
            {badge}
          </div>

          <h1 className="truncate text-[28px] font-semibold tracking-[-0.045em] text-[#17181b]">
            {title}
          </h1>

          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="harmony-topbar-search flex h-11 min-w-0 items-center gap-3 rounded-full border px-4 transition focus-within:border-blue-300 sm:w-[320px]">
            <Search size={18} className="shrink-0 text-[#86868b]" />

            <input
              type="text"
              placeholder="Cari nama, NIP, unit kerja, atau menu..."
              className="w-full rounded-full border-0 bg-transparent text-sm text-[#1d1d1f] shadow-none outline-none ring-0 placeholder:text-[#86868b] focus:border-0 focus:outline-none focus:ring-0"
            />
          </div>

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={handleToggleNotification}
              aria-controls="harmony-notification-panel"
              aria-expanded={isOpen}
              className="harmony-topbar-action relative flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold text-[#25272c] transition"
            >
              <span className="relative">
                <Bell size={18} className="text-[#007aff]" />

                {totalBadgeCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                  </span>
                )}
              </span>

              Notifications
            </button>

            {isOpen && createPortal(
              <div ref={popoverRef} id="harmony-notification-panel" className="harmony-popover-glass harmony-notification-portal fixed w-[min(460px,calc(100vw-24px))] overflow-hidden rounded-[28px] border" style={popoverPosition} role="dialog" aria-label="Pusat Notifikasi">
                <div className="flex items-start justify-between gap-3 border-b border-black/5 p-5">
                  <div>
                    <h2 className="text-base font-bold tracking-[-0.02em] text-[#1d1d1f]">
                      Pusat Notifikasi
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-[#86868b]">
                      {pendingTaskCount > 0
                        ? `${pendingTaskCount} task belum dibaca`
                        : 'Tidak ada task baru'}
                      {' · '}
                      {unreadHistoryCount} riwayat belum dibaca
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void refreshAll()}
                      disabled={isLoading || isRefreshingTasks}
                      title="Refresh task dan notifikasi"
                      className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#6e6e73] transition hover:bg-[#e8f2ff] hover:text-[#007aff] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCcw
                        size={15}
                        className={
                          isLoading || isRefreshingTasks ? 'animate-spin' : ''
                        }
                      />
                    </button>

                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      disabled={isMarking || (unreadHistoryCount === 0 && unreadTasks.length === 0)}
                      title="Tandai semua task dan riwayat sebagai dibaca"
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
                      aria-label="Tutup pusat notifikasi"
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

                {taskWarning && (
                  <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs leading-5 text-amber-700">
                    {taskWarning}
                  </div>
                )}

                <div className="max-h-[560px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center gap-3 p-5 text-sm font-medium text-[#6e6e73]">
                      <Loader2 size={18} className="animate-spin" />
                      Memuat task dan notifikasi...
                    </div>
                  ) : (
                    <>
                      <section className="harmony-notification-tasks border-b border-black/5 bg-[#fffaf0]">
                        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={15} className="text-amber-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800">
                              Perlu Tindakan
                            </h3>
                          </div>

                          <div className="flex items-center gap-2">
                            {allTaskCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowReadTasks((value) => !value)}
                                className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-50"
                              >
                                {showReadTasks ? 'Hanya belum dibaca' : `Lihat semua (${allTaskCount})`}
                              </button>
                            )}
                            {pendingTaskCount > 0 && (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                                {pendingTaskCount} baru
                              </span>
                            )}
                          </div>
                        </div>

                        {visibleTasks.length === 0 ? (
                          <div className="px-5 pb-5 pt-2">
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                              <div className="flex items-start gap-3">
                                <ShieldCheck
                                  size={18}
                                  className="mt-0.5 shrink-0 text-emerald-600"
                                />
                                <div>
                                  <p className="text-sm font-bold text-emerald-800">
                                    {tasks.length === 0 ? 'Semua task selesai' : 'Tidak ada task belum dibaca'}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                                    {tasks.length === 0
                                      ? 'Tidak ada pekerjaan workflow yang membutuhkan tindakan Anda.'
                                      : 'Task yang ditandai dibaca tetap ada dalam workflow. Gunakan Lihat semua untuk membukanya kembali.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 px-3 pb-4">
                            {visibleTasks.map((item) => (
                              <div
                                key={item.id}
                                className={`harmony-notification-task-card rounded-2xl border p-4 shadow-sm transition ${readTaskKeys[taskFingerprint(item)] ? 'border-slate-200 bg-slate-50' : 'border-amber-100 bg-white'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${priorityIconClass(item.priority)}`}
                                  >
                                    <CircleDot size={16} />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h4 className="text-sm font-bold leading-5 text-[#1d1d1f]">
                                            {item.title}
                                          </h4>
                                          <TaskScopeBadge scope={item.scope} />
                                        </div>

                                        <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
                                          {item.message}
                                        </p>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-2">
                                        <span className="flex min-w-7 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-[11px] font-bold text-white">
                                          {item.count}
                                        </span>
                                        <ChevronRight size={15} className="text-[#86868b]" />
                                      </div>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#9a9aa0]">
                                      <span className={priorityTextClass(item.priority)}>
                                        {priorityLabel(item.priority)}
                                      </span>
                                      {item.period_month && (
                                        <>
                                          <span>•</span>
                                          <span>Periode {item.period_month}</span>
                                        </>
                                      )}
                                      {item.oldest_created_at && (
                                        <>
                                          <span>•</span>
                                          <span>
                                            Tertua {getRelativeTime(item.oldest_created_at)}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3 flex justify-end gap-2 border-t border-amber-100/70 pt-3">
                                  {readTaskKeys[taskFingerprint(item)] ? (
                                    <span className="self-center text-[11px] font-semibold text-slate-500">Sudah dibaca</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => markTaskRead(item)}
                                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      Tandai dibaca
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => openTask(item)}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                  >
                                    Buka pekerjaan
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="border-t border-amber-100 px-5 py-3 text-[11px] leading-5 text-amber-700">
                          Tandai dibaca hanya menyembunyikan pengingat pada browser ini, bukan menyetujui atau menghapus pekerjaan. Jika jumlah task berubah, pengingat baru akan muncul lagi.
                        </div>
                      </section>

                      <section>
                        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
                          <div className="flex items-center gap-2">
                            <Bell size={15} className="text-[#007aff]" />
                            <h3 className="text-xs font-bold uppercase tracking-wide text-[#41607d]">
                              Riwayat Notifikasi
                            </h3>
                          </div>

                          {unreadHistoryCount > 0 && (
                            <span className="rounded-full bg-[#e8f2ff] px-2.5 py-1 text-[11px] font-bold text-[#0059b8]">
                              {unreadHistoryCount} baru
                            </span>
                          )}
                        </div>

                        {notifications.length === 0 ? (
                          <div className="p-6 pt-3 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
                              <Bell size={22} />
                            </div>

                            <h3 className="mt-4 text-sm font-bold text-[#1d1d1f]">
                              Belum ada riwayat notifikasi
                            </h3>

                            <p className="mt-1 text-xs leading-5 text-[#86868b]">
                              Notifikasi event dan email HARMONY akan muncul di sini.
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
                      </section>
                    </>
                  )}
                </div>

                <div className="border-t border-black/5 bg-[#f5f5f7]/70 px-5 py-3 text-center text-[11px] leading-5 text-[#86868b]">
                  Task dihitung langsung dari status workflow canonical. Riwayat event tetap diambil dari notification_logs.
                </div>
              </div>, document.body
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function priorityLabel(priority: HarmonyTaskPriority) {
  if (priority === 'urgent') return 'Mendesak'
  if (priority === 'high') return 'Perlu tindakan'
  return 'Normal'
}

function priorityTextClass(priority: HarmonyTaskPriority) {
  if (priority === 'urgent') return 'text-red-600'
  if (priority === 'high') return 'text-amber-700'
  return 'text-blue-700'
}

function priorityIconClass(priority: HarmonyTaskPriority) {
  if (priority === 'urgent') return 'bg-red-50 text-red-600'
  if (priority === 'high') return 'bg-amber-50 text-amber-700'
  return 'bg-blue-50 text-blue-700'
}

function TaskScopeBadge({ scope }: { scope: HarmonyTaskScope }) {
  const meta = {
    employee: {
      label: 'Saya',
      className: 'bg-blue-50 text-blue-700',
    },
    supervisor: {
      label: 'Atasan',
      className: 'bg-purple-50 text-purple-700',
    },
    hr: {
      label: 'HR',
      className: 'bg-emerald-50 text-emerald-700',
    },
  }[scope]

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

export default Topbar
