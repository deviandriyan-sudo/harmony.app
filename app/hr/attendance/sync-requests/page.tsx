'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type LeaveRequest = {
  id: string
  employee_id: string | null

  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null

  request_category: string | null
  leave_type: string | null
  request_type: string | null

  start_date: string | null
  end_date: string | null
  total_days: number | null

  reason: string | null
  job_pending: string | null
  handover_to: string | null
  handover_note: string | null

  proof_file_url: string | null
  proof_file_name: string | null

  status: string | null
  supervisor_status: string | null
  supervisor_name: string | null
  supervisor_approved_at: string | null

  hr_status: string | null
  hr_approved_by: string | null
  hr_approved_at: string | null

  created_at: string | null
  updated_at: string | null
}

export default function HRSyncApprovedRequestsPage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth())
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')

  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const periodRange = useMemo(() => {
    return getCutoffRange(periodMonth)
  }, [periodMonth])

  const filteredRequests = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return requests.filter((item) => {
      return (
        !keyword ||
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.leave_type?.toLowerCase().includes(keyword) ||
        item.request_type?.toLowerCase().includes(keyword) ||
        item.supervisor_name?.toLowerCase().includes(keyword)
      )
    })
  }, [requests, searchKeyword])

  const summary = useMemo(() => {
    return requests.reduce(
      (acc, item) => {
        acc.total += 1

        const type = normalizeText(item.request_type)

        if (type === 'annual_leave') acc.annualLeave += 1
        if (type === 'phl_claim') acc.phlClaim += 1
        if (type === 'sick') acc.sick += 1
        if (type === 'permit') acc.permit += 1
        if (type === 'official_travel') acc.officialTravel += 1
        if (type.includes('leave') && type !== 'annual_leave') acc.otherLeave += 1

        return acc
      },
      {
        total: 0,
        annualLeave: 0,
        phlClaim: 0,
        sick: 0,
        permit: 0,
        officialTravel: 0,
        otherLeave: 0,
      }
    )
  }, [requests])

  useEffect(() => {
    fetchRequests()
  }, [periodMonth])

  async function fetchRequests() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('status', 'approved')
      .eq('supervisor_status', 'approved')
      .lte('start_date', periodRange.end)
      .gte('end_date', periodRange.start)
      .order('start_date', { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setRequests([])
      setLoading(false)
      return
    }

    setRequests(data || [])
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { data, error } = await supabase.rpc('sync_approved_leave_requests_to_attendance', {
      p_period_month: periodMonth,
    })

    if (error) {
      setErrorMessage(error.message)
      setSyncing(false)
      return
    }

    setSuccessMessage(String(data || 'Sync approved request berhasil.'))
    setSyncing(false)

    await fetchRequests()
  }

  return (
    <>
      <Topbar
        title="Sinkron Pengajuan Approved"
        description="Sinkron cuti, izin, sakit, tugas luar, dan klaim PHL yang sudah disetujui atasan ke data absensi."
      />

      <section className="space-y-6 p-6">
        {successMessage && (
          <AlertBox tone="green" title="Berhasil" icon={<CheckCircle2 size={18} />}>
            {successMessage}
          </AlertBox>
        )}

        {errorMessage && (
          <AlertBox tone="orange" title="Perhatian" icon={<AlertTriangle size={18} />}>
            {errorMessage}
          </AlertBox>
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
                <ShieldCheck size={15} className="text-[#5ac8fa]" />
                Approved Request Sync
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Sinkron Approved Request
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Tarik pengajuan cuti, izin, sakit, tugas luar, dan klaim PHL yang sudah
                approved atasan ke attendance_logs agar tampil di absensi final HR.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[720px]">
              <HeroMetric label="Approved" value={String(summary.total)} />
              <HeroMetric label="Cuti" value={String(summary.annualLeave + summary.otherLeave)} />
              <HeroMetric label="Klaim PHL" value={String(summary.phlClaim)} />
              <HeroMetric label="Sakit/Izin" value={String(summary.sick + summary.permit)} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Approved Request"
            value={`${summary.total}`}
            description="Pengajuan approved atasan"
            icon={<CheckCircle2 size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Cuti"
            value={`${summary.annualLeave + summary.otherLeave}`}
            description="Cuti tahunan dan cuti khusus"
            icon={<CalendarDays size={22} />}
            tone="blue"
          />

          <SummaryCard
            title="Klaim PHL"
            value={`${summary.phlClaim}`}
            description="Pengambilan saldo PHL"
            icon={<Clock3 size={22} />}
            tone="purple"
          />

          <SummaryCard
            title="Tugas Luar"
            value={`${summary.officialTravel}`}
            description="Dinas / tugas luar"
            icon={<FileText size={22} />}
            tone="orange"
          />
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <label className="block">
                <span className="harmony-label">Periode Cut-off</span>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(event) => setPeriodMonth(event.target.value)}
                  className="harmony-input"
                />
              </label>

              <div>
                <span className="harmony-label">Rentang Periode</span>
                <div className="flex min-h-12 items-center rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 text-sm font-semibold text-[#1d1d1f]">
                  {formatDisplayDate(periodRange.start)} - {formatDisplayDate(periodRange.end)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-h-12 w-full items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm md:w-[340px]">
                <Search size={18} className="shrink-0 text-[#86868b]" />
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Cari nama, jenis, unit..."
                  className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                />
              </div>

              <button
                type="button"
                onClick={fetchRequests}
                className="harmony-button-secondary"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCcw size={18} />
                )}
                Refresh
              </button>

              <button
                type="button"
                disabled={syncing}
                onClick={handleSync}
                className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ShieldCheck size={18} />
                )}
                {syncing ? 'Sinkron...' : 'Sinkron ke Absensi'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat pengajuan approved...
            </div>
          ) : (
            <ApprovedRequestsTable requests={filteredRequests} />
          )}
        </div>
      </section>
    </>
  )
}

function ApprovedRequestsTable({
  requests,
}: {
  requests: LeaveRequest[]
}) {
  if (requests.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
            <FileText size={24} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
            Belum ada pengajuan approved
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
            Data akan muncul setelah atasan menyetujui cuti, izin, sakit, tugas luar, atau klaim PHL.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1450px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
            <th className="px-5 py-4 font-semibold">Karyawan</th>
            <th className="px-5 py-4 font-semibold">Jenis</th>
            <th className="px-5 py-4 font-semibold">Tanggal</th>
            <th className="px-5 py-4 font-semibold">Hari</th>
            <th className="px-5 py-4 font-semibold">Atasan</th>
            <th className="px-5 py-4 font-semibold">Job Pending</th>
            <th className="px-5 py-4 font-semibold">Bukti</th>
          </tr>
        </thead>

        <tbody>
          {requests.map((item) => (
            <tr
              key={item.id}
              className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70"
            >
              <td className="px-5 py-4">
                <EmployeeCell request={item} />
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={item.leave_type || formatRequestType(item.request_type || '')}
                  tone={getRequestTone(item.request_type || '')}
                />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.request_type || '-'}
                </p>
              </td>

              <td className="px-5 py-4">
                <p className="font-semibold text-[#1d1d1f]">
                  {formatDisplayDate(item.start_date || '')}
                </p>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  s.d. {formatDisplayDate(item.end_date || '')}
                </p>
              </td>

              <td className="px-5 py-4">
                <span className="inline-flex rounded-xl bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                  {Number(item.total_days || 0)} hari
                </span>
              </td>

              <td className="px-5 py-4">
                <p className="font-semibold text-[#1d1d1f]">
                  {item.supervisor_name || '-'}
                </p>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  Approved: {formatDateTime(item.supervisor_approved_at || '')}
                </p>
              </td>

              <td className="px-5 py-4">
                <p className="line-clamp-3 max-w-[320px] text-sm leading-6 text-[#6e6e73]">
                  {item.job_pending || '-'}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">
                  Dialihkan ke: {item.handover_to || '-'}
                </p>
              </td>

              <td className="px-5 py-4">
                {item.proof_file_url ? (
                  <a
                    href={item.proof_file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
                  >
                    <FileText size={15} />
                    Lihat
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-[#86868b]">
                    -
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmployeeCell({
  request,
}: {
  request: LeaveRequest
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
        <UserRound size={18} />
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-[#1d1d1f]">
          {request.full_name || '-'}
        </p>

        <p className="mt-1 line-clamp-1 text-xs text-[#6e6e73]">
          {request.employee_number || '-'} · PIN {request.machine_pin || '-'}
        </p>

        <p className="mt-1 line-clamp-1 text-xs text-[#86868b]">
          {request.department || '-'} · {request.position || '-'}
        </p>
      </div>
    </div>
  )
}

function AlertBox({
  tone,
  title,
  icon,
  children,
}: {
  tone: 'green' | 'orange'
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const className =
    tone === 'green'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-orange-200 bg-orange-50 text-orange-700'

  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 ${className}`}>
      <div className="mb-1 flex items-center gap-2 font-bold">
        {icon}
        {title}
      </div>
      {children}
    </div>
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

          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#86868b]">
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

function StatusBadge({
  label,
  tone,
}: {
  label: string
  tone: 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'neutral'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
    neutral: 'bg-[#f5f5f7] text-[#6e6e73]',
  }[tone]

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
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

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}

function formatRequestType(value: string) {
  const normalized = normalizeText(value)

  if (normalized === 'annual_leave') return 'Cuti Tahunan'
  if (normalized === 'marriage_leave') return 'Cuti Menikah'
  if (normalized === 'maternity_leave') return 'Cuti Melahirkan'
  if (normalized === 'miscarriage_leave') return 'Cuti Keguguran'
  if (normalized === 'bereavement_leave') return 'Cuti Duka'
  if (normalized === 'child_circumcision_leave') return 'Cuti Khitan / Baptis Anak'
  if (normalized === 'worship_leave') return 'Cuti Ibadah'
  if (normalized === 'menstrual_leave') return 'Cuti Haid'
  if (normalized === 'pregnancy_check_leave') return 'Pemeriksaan Kehamilan'
  if (normalized === 'sick') return 'Sakit'
  if (normalized === 'permit') return 'Izin'
  if (normalized === 'official_travel') return 'Tugas Luar / Dinas'
  if (normalized === 'phl_claim') return 'Klaim PHL'
  if (normalized === 'other_leave') return 'Cuti Lainnya'

  return value || '-'
}

function getRequestTone(value: string): 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'neutral' {
  const normalized = normalizeText(value)

  if (normalized === 'phl_claim') return 'purple'
  if (normalized === 'sick') return 'orange'
  if (normalized === 'permit') return 'blue'
  if (normalized === 'official_travel') return 'green'
  if (normalized.includes('leave')) return 'blue'

  return 'neutral'
}