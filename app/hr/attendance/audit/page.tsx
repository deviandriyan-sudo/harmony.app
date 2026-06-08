'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  History,
  Loader2,
  Lock,
  LockOpen,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type AuditLog = {
  id: string

  action_type: string
  action_label: string

  period_month: string | null
  period_start: string | null
  period_end: string | null

  employee_id: string | null
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null

  actor_id: string | null
  actor_name: string | null
  actor_role: string | null

  total_affected: number | null

  note: string | null
  metadata: Record<string, unknown> | null

  created_at: string | null
}

type ActionFilter =
  | 'all'
  | 'hr_finalize_period'
  | 'hr_lock_period'
  | 'hr_unlock_period'

export default function AttendanceAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])

  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth())
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const filteredLogs = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return logs.filter((item) => {
      const matchAction =
        actionFilter === 'all' ||
        item.action_type === actionFilter

      const matchKeyword =
        !keyword ||
        item.action_label?.toLowerCase().includes(keyword) ||
        item.actor_name?.toLowerCase().includes(keyword) ||
        item.note?.toLowerCase().includes(keyword) ||
        item.period_month?.toLowerCase().includes(keyword) ||
        item.full_name?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword)

      return matchAction && matchKeyword
    })
  }, [logs, actionFilter, searchKeyword])

  const summary = useMemo(() => {
    return logs.reduce(
      (acc, item) => {
        acc.total += 1

        if (item.action_type === 'hr_finalize_period') {
          acc.finalize += 1
        }

        if (item.action_type === 'hr_lock_period') {
          acc.lock += 1
        }

        if (item.action_type === 'hr_unlock_period') {
          acc.unlock += 1
        }

        acc.affected += Number(item.total_affected || 0)

        return acc
      },
      {
        total: 0,
        finalize: 0,
        lock: 0,
        unlock: 0,
        affected: 0,
      }
    )
  }, [logs])

  useEffect(() => {
    fetchAuditLogs()
  }, [periodMonth])

  async function fetchAuditLogs() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const query = supabase
      .from('attendance_audit_logs')
      .select('*')
      .eq('period_month', periodMonth)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      setErrorMessage(error.message)
      setLogs([])
      setLoading(false)
      return
    }

    setLogs(data || [])
    setLoading(false)
  }

  function exportCsv() {
    if (filteredLogs.length === 0) {
      setErrorMessage('Tidak ada data audit untuk diexport.')
      return
    }

    const rows = filteredLogs.map((item, index) => ({
      No: index + 1,
      Waktu: formatDateTime(item.created_at || ''),
      Aksi: item.action_label || '-',
      'Kode Aksi': item.action_type || '-',
      Periode: item.period_month || '-',
      'Tanggal Mulai': formatDisplayDate(item.period_start || ''),
      'Tanggal Selesai': formatDisplayDate(item.period_end || ''),
      Aktor: item.actor_name || '-',
      Role: item.actor_role || '-',
      'Total Terdampak': item.total_affected || 0,
      Karyawan: item.full_name || '-',
      NIP: item.employee_number || '-',
      Unit: item.department || '-',
      Jabatan: item.position || '-',
      Catatan: item.note || '-',
      Metadata: JSON.stringify(item.metadata || {}),
    }))

    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map((row) => {
        return headers
          .map((header) => {
            const value = String(row[header as keyof typeof row] ?? '')
            return `"${value.replace(/"/g, '""')}"`
          })
          .join(',')
      }),
    ].join('\n')

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `AUDIT_ABSENSI_${periodMonth}.csv`
    link.click()

    URL.revokeObjectURL(url)

    setSuccessMessage('Export CSV audit absensi berhasil dibuat.')
  }

  return (
    <>
      <Topbar
        title="Audit Absensi"
        description="Riwayat finalisasi, lock, unlock, dan aksi penting absensi HR."
      />

      <section className="space-y-6 p-6">
        {successMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CheckCircle2 size={18} />
              Berhasil
            </div>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <AlertTriangle size={18} />
              Perhatian
            </div>
            {errorMessage}
          </div>
        )}

        <div className="relative overflow-hidden rounded-[34px] border border-black/5 bg-[#1d1d1f] p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/hr/attendance"
                className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 backdrop-blur-xl transition hover:bg-white/15"
              >
                <ArrowLeft size={15} />
                Kembali ke Absensi
              </Link>

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <History size={15} className="text-[#5ac8fa]" />
                Attendance Audit Trail
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Audit Absensi
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Pantau siapa yang melakukan finalisasi, lock, unlock, dan perubahan penting
                pada periode absensi.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[720px]">
              <HeroMetric label="Total Log" value={String(summary.total)} />
              <HeroMetric label="Finalisasi" value={String(summary.finalize)} />
              <HeroMetric label="Lock" value={String(summary.lock)} />
              <HeroMetric label="Unlock" value={String(summary.unlock)} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Log"
            value={`${summary.total}`}
            description="Jumlah aktivitas pada periode ini"
            icon={<History size={22} />}
            tone="blue"
          />

          <SummaryCard
            title="Finalisasi HR"
            value={`${summary.finalize}`}
            description="Jumlah aktivitas finalisasi periode"
            icon={<ShieldCheck size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Lock"
            value={`${summary.lock}`}
            description="Jumlah aktivitas penguncian periode"
            icon={<Lock size={22} />}
            tone="orange"
          />

          <SummaryCard
            title="Unlock"
            value={`${summary.unlock}`}
            description="Jumlah aktivitas buka lock periode"
            icon={<LockOpen size={22} />}
            tone="purple"
          />
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 md:grid-cols-[220px_280px_1fr]">
              <label className="block">
                <span className="harmony-label">Periode Cutoff</span>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(event) => setPeriodMonth(event.target.value)}
                  className="harmony-input"
                />
              </label>

              <label className="block">
                <span className="harmony-label">Filter Aksi</span>
                <select
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
                  className="harmony-select"
                >
                  <option value="all">Semua Aksi</option>
                  <option value="hr_finalize_period">Finalisasi Periode HR</option>
                  <option value="hr_lock_period">Kunci Periode</option>
                  <option value="hr_unlock_period">Buka Lock Periode</option>
                </select>
              </label>

              <div>
                <span className="harmony-label">Rentang Periode</span>
                <div className="flex min-h-12 items-center rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 text-sm font-semibold text-[#1d1d1f]">
                  {formatDisplayDate(getCutoffRange(periodMonth).start)} - {formatDisplayDate(getCutoffRange(periodMonth).end)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-h-12 w-full items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm md:w-[340px]">
                <Search size={18} className="shrink-0 text-[#86868b]" />
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Cari aktor, aksi, catatan..."
                  className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                />
              </div>

              <button
                type="button"
                onClick={exportCsv}
                className="harmony-button-secondary"
              >
                <Download size={18} />
                Export CSV
              </button>

              <button
                type="button"
                onClick={fetchAuditLogs}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat audit log absensi...
            </div>
          ) : (
            <AuditTable logs={filteredLogs} />
          )}
        </div>
      </section>
    </>
  )
}

function AuditTable({
  logs,
}: {
  logs: AuditLog[]
}) {
  if (logs.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
            <FileText size={24} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
            Belum ada audit log
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
            Audit log akan muncul setelah HR melakukan finalisasi, lock, atau unlock periode.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1400px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
            <th className="px-5 py-4 font-semibold">Waktu</th>
            <th className="px-5 py-4 font-semibold">Aksi</th>
            <th className="px-5 py-4 font-semibold">Periode</th>
            <th className="px-5 py-4 font-semibold">Aktor</th>
            <th className="px-5 py-4 font-semibold">Terdampak</th>
            <th className="px-5 py-4 font-semibold">Catatan</th>
          </tr>
        </thead>

        <tbody>
          {logs.map((item) => (
            <tr
              key={item.id}
              className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70"
            >
              <td className="px-5 py-4">
                <p className="font-semibold text-[#1d1d1f]">
                  {formatDateTime(item.created_at || '')}
                </p>
              </td>

              <td className="px-5 py-4">
                <ActionBadge actionType={item.action_type} label={item.action_label} />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.action_type}
                </p>
              </td>

              <td className="px-5 py-4">
                <p className="font-semibold text-[#1d1d1f]">
                  {item.period_month || '-'}
                </p>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {formatDisplayDate(item.period_start || '')} - {formatDisplayDate(item.period_end || '')}
                </p>
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#007aff]">
                    <UserRound size={17} />
                  </div>

                  <div>
                    <p className="font-semibold text-[#1d1d1f]">
                      {item.actor_name || '-'}
                    </p>
                    <p className="mt-1 text-xs text-[#6e6e73]">
                      {item.actor_role || '-'}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4">
                <span className="inline-flex rounded-xl bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                  {item.total_affected || 0} data
                </span>
              </td>

              <td className="px-5 py-4">
                <p className="line-clamp-3 max-w-[420px] text-sm leading-6 text-[#6e6e73]">
                  {item.note || '-'}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActionBadge({
  actionType,
  label,
}: {
  actionType: string
  label: string
}) {
  const config =
    actionType === 'hr_finalize_period'
      ? {
          className: 'bg-green-50 text-green-700',
          icon: <ShieldCheck size={14} />,
        }
      : actionType === 'hr_lock_period'
        ? {
            className: 'bg-orange-50 text-orange-700',
            icon: <Lock size={14} />,
          }
        : actionType === 'hr_unlock_period'
          ? {
              className: 'bg-[#f7edfc] text-[#7b2cbf]',
              icon: <LockOpen size={14} />,
            }
          : {
              className: 'bg-[#f5f5f7] text-[#6e6e73]',
              icon: <History size={14} />,
            }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${config.className}`}>
      {config.icon}
      {label || actionType}
    </span>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
  }[tone]

  return (
    <div className="harmony-card harmony-hover-lift p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function HeroMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold text-white">
        {value}
      </p>
    </div>
  )
}

function getCurrentPeriodMonth() {
  const today = new Date()
  const day = today.getDate()
  const period = new Date(today)

  if (day <= 10) {
    period.setMonth(period.getMonth() - 1)
  }

  return `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`
}

function getCutoffRange(periodMonth: string) {
  const [yearText, monthText] = periodMonth.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  const start = new Date(year, month - 1, 11)
  const end = new Date(year, month, 10)

  return {
    start: formatDateToISO(start),
    end: formatDateToISO(end),
  }
}

function formatDateToISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}