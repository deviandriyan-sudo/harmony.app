'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Fingerprint,
  History,
  Plane,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react'

import { TodayTeamAvailability } from '@/components/employee/TodayTeamAvailability'
import { Topbar } from '@/components/layout/Topbar'
import { CompactMetric } from '@/components/dashboard/CompactMetric'
import { GlassHeroVisual } from '@/components/dashboard/GlassHeroVisual'
import { WorkspaceActions } from '@/components/dashboard/WorkspaceActions'
import { getCurrentPeriodMonthWita, getCutoffRange } from '@/lib/attendance-reporting'
import { supabase } from '@/lib/supabase'
import { harmonyFetch } from '@/lib/harmony-client'
import { getApprovalStageLabel, isWorkflowPending } from '@/lib/leave-workflow-status'

type AppUser = {
  id: string
  email: string | null
  role: string | null
  employee_id: string | null
  is_active: boolean | null
}

type Employee = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  annual_leave_balance: number | null
  phl_balance: number | null
}

type BalanceSummary = {
  employee_id: string
  annual_total_available_days: number | null
  phl_total_available_days: number | null
  postpone_active_days: number | null
  postpone_expired_days: number | null
  next_postpone_expiry: string | null
  next_phl_expiry: string | null
  balance_integrity_status?: 'ok' | 'reconciled_from_cycle' | 'summary_only'
  balance_integrity_difference_days?: number | null
}

type AttendanceRow = {
  attendance_date: string | null
  check_in: string | null
  check_out: string | null
  manual_check_in?: string | null
  manual_check_out?: string | null
  status: string | null
}

type RequestItem = {
  id: string
  type: 'leave' | 'phl' | 'debt'
  label: string
  date: string
  status: string
  reason: string
  createdAt: string
}

type AnnualLeaveDebtHistoryItem = {
  id: string
  original_days: number | null
  remaining_days: number | null
  status: string | null
  origin: string | null
  apply_from_maturity: string | null
  created_at: string | null
  updated_at: string | null
  applied_days: number | null
  last_applied_at: string | null
}

type AnnualLeaveDebtHistoryResponse = {
  success?: boolean
  outstanding_days?: number | null
  next_maturity?: string | null
  debts?: AnnualLeaveDebtHistoryItem[]
}

export default function EmployeeDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [balance, setBalance] = useState<BalanceSummary | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [debtOutstandingDays, setDebtOutstandingDays] = useState(0)
  const [debtNextMaturity, setDebtNextMaturity] = useState<string | null>(null)

  const periodMonth = useMemo(() => getCurrentPeriodMonthWita(), [])
  const periodRange = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    setRefreshing(true)
    setMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw new Error('Session tidak ditemukan. Silakan login ulang.')

      const { data: appUserData, error: appUserError } = await supabase
        .from('app_users')
        .select('id,email,role,employee_id,is_active')
        .eq('id', authData.user.id)
        .maybeSingle<AppUser>()

      if (appUserError) throw appUserError
      if (!appUserData || appUserData.is_active === false) throw new Error('Akun HARMONY tidak aktif atau belum terdaftar.')

      setAppUser(appUserData)

      let employeeData: Employee | null = null
      if (appUserData.employee_id) {
        const response = await supabase.from('employees').select('*').eq('id', appUserData.employee_id).maybeSingle<Employee>()
        if (response.error) throw response.error
        employeeData = response.data || null
      }

      if (!employeeData && authData.user.email) {
        const response = await supabase.from('employees').select('*').ilike('email', authData.user.email).limit(1)
        if (response.error) throw response.error
        employeeData = (response.data?.[0] || null) as Employee | null
      }

      if (!employeeData) throw new Error('Akun belum terhubung ke data employee. Hubungi HR.')
      setEmployee(employeeData)

      const balancePayload = await harmonyFetch<{
        balance_summary?: BalanceSummary | null
        balance_integrity_warning?: string | null
      }>('/api/employee/leave/postpone')

      if (balancePayload.balance_integrity_warning) {
        console.warn('Leave balance integrity warning:', balancePayload.balance_integrity_warning)
      }

      setBalance(balancePayload.balance_summary || null)

      const [
        attendanceResponse,
        leaveResponse,
        phlResponse,
        pendingLeaveResponse,
        pendingPHLResponse,
      ] = await Promise.all([
        supabase
          .from('attendance_logs')
          .select('attendance_date,check_in,check_out,manual_check_in,manual_check_out,status')
          .eq('employee_id', employeeData.id)
          .is('deleted_at', null)
          .gte('attendance_date', periodRange.start)
          .lte('attendance_date', periodRange.end)
          .order('attendance_date', { ascending: false }),
        supabase
          .from('leave_requests')
          .select('id,request_type,leave_type,start_date,end_date,status,supervisor_status,hr_status,reason,created_at')
          .eq('employee_id', employeeData.id)
          .neq('request_type', 'phl_claim')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('phl_records')
          .select('id,phl_date,status,supervisor_status,hr_status,reason,created_at')
          .eq('employee_id', employeeData.id)
          .eq('source', 'employee_phl_claim')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('leave_requests')
          .select('status,supervisor_status,hr_status')
          .eq('employee_id', employeeData.id)
          .neq('request_type', 'phl_claim'),
        supabase
          .from('phl_records')
          .select('status,supervisor_status,hr_status')
          .eq('employee_id', employeeData.id)
          .eq('source', 'employee_phl_claim'),
      ])

      if (attendanceResponse.error) throw attendanceResponse.error
      setAttendance((attendanceResponse.data || []) as AttendanceRow[])

      if (leaveResponse.error) throw leaveResponse.error
      if (phlResponse.error) throw phlResponse.error
      if (pendingLeaveResponse.error) throw pendingLeaveResponse.error
      if (pendingPHLResponse.error) throw pendingPHLResponse.error

      const canonicalPendingCount = [
        ...(pendingLeaveResponse.data || []),
        ...(pendingPHLResponse.data || []),
      ].filter((row: any) => isWorkflowPending(row)).length

      setPendingRequestCount(canonicalPendingCount)

      let debtItems: RequestItem[] = []

      const debtResponse = await supabase.rpc(
        'harmony_get_my_annual_leave_debt_history_v1',
      )

      if (!debtResponse.error) {
        const debtData = (debtResponse.data || {}) as AnnualLeaveDebtHistoryResponse

        setDebtOutstandingDays(Number(debtData.outstanding_days || 0))
        setDebtNextMaturity(debtData.next_maturity || null)

        debtItems = (debtData.debts || []).map((row) => {
          const originalDays = Number(row.original_days || 0)
          const remainingDays = Number(row.remaining_days || 0)
          const appliedDays = Number(row.applied_days || 0)
          const isLegacy = normalizeStatus(row.origin) === 'legacy_existing_credit'
          const statusLabel = labelDebtStatus(row.status)
          const targetText = row.apply_from_maturity
            ? `Target pelunasan ${formatDate(row.apply_from_maturity)}`
            : 'Target pelunasan belum tersedia'

          let reason = isLegacy
            ? `Hutang cuti lama ${originalDays} hari. Saldo advance sudah pernah diberikan sebelum fitur hutang cuti aktif.`
            : `Advance cuti ${originalDays} hari diberikan lebih awal dan akan diperhitungkan pada hak cuti tahunan berikutnya.`

          if (remainingDays > 0) {
            reason += ` Sisa hutang ${remainingDays} hari. ${targetText}.`
          } else {
            reason += ` Hutang sudah lunas${appliedDays > 0 ? ` (${appliedDays} hari telah diperhitungkan)` : ''}.`
          }

          return {
            id: row.id,
            type: 'debt' as const,
            label: isLegacy ? 'Hutang Cuti Legacy' : 'Hutang Cuti',
            date:
              remainingDays > 0
                ? targetText
                : row.last_applied_at
                  ? `Dilunasi ${formatDateTime(row.last_applied_at)}`
                  : 'Status hutang selesai',
            status: statusLabel,
            reason,
            createdAt: String(row.created_at || row.updated_at || ''),
          }
        })
      } else {
        // Dashboard tetap boleh dipakai bila migration FEATURE-011 V2.1
        // belum terpasang. Hutang hanya tidak ditampilkan sampai RPC tersedia.
        setDebtOutstandingDays(0)
        setDebtNextMaturity(null)
      }

      const leaveItems: RequestItem[] = (leaveResponse.data || []).map((row: any) => ({
        id: row.id,
        type: 'leave',
        label: row.leave_type || labelRequestType(row.request_type),
        date:
          row.start_date && row.end_date && row.start_date !== row.end_date
            ? `${formatDate(row.start_date)} – ${formatDate(row.end_date)}`
            : formatDate(row.start_date),
        status: getApprovalStageLabel(row),
        reason: row.reason || '-',
        createdAt: String(row.created_at || ''),
      }))

      const phlItems: RequestItem[] = (phlResponse.data || []).map((row: any) => ({
        id: row.id,
        type: 'phl',
        label: 'Klaim PHL',
        date: formatDate(row.phl_date),
        status: getApprovalStageLabel(row),
        reason: row.reason || '-',
        createdAt: String(row.created_at || ''),
      }))

      // Canonical employee history feed:
      // - leave/izin/sakit/ST hanya dari leave_requests non-PHL
      // - klaim PHL hanya dari phl_records source=employee_phl_claim
      // - hutang cuti hanya dari employee-safe debt RPC (read-only)
      // Hutang TIDAK ikut Pending Request karena bukan workflow approval.
      setRequests(
        [...leaveItems, ...phlItems, ...debtItems]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 10),
      )
    } catch (error: any) {
      setMessage(error?.message || 'Dashboard employee gagal dimuat.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const recordedAttendance = attendance.filter((row) => Boolean(row.check_in || row.check_out || row.manual_check_in || row.manual_check_out)).length
  const annualBalance = balance ? Number(balance.annual_total_available_days ?? 0) : null
  const phlBalance = Number(balance?.phl_total_available_days ?? employee?.phl_balance ?? 0)

  return (
    <>
      <Topbar title="Beranda" />
      <section className="harmony-glass-showcase harmony-glass-showcase-employee harmony-page-bg mx-auto min-h-screen max-w-[1500px] space-y-4 p-4 sm:p-5 lg:p-6">
        {message && <div role="alert" className="flex gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700"><AlertTriangle size={16}/>{message}</div>}
        <div className="harmony-glass-dark harmony-glass-role-hero harmony-glass-role-employee flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-4 py-4 text-white sm:px-5">
          <GlassHeroVisual role="employee" /><div className="min-w-0"><p className="text-[11px] text-white/60">Selamat datang kembali</p><h1 className="truncate text-lg font-bold sm:text-xl">{employee?.full_name || appUser?.email || 'Karyawan'}</h1><p className="mt-1 text-[11px] text-white/60">{employee?.employee_number || '—'} · {employee?.department || '—'} · {periodRange.label}</p></div>
          <button type="button" onClick={fetchDashboardData} disabled={refreshing} title="Perbarui" aria-label="Perbarui dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white"><RefreshCcw size={17} className={refreshing ? 'animate-spin' : ''} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <CompactMetric label="Saldo Cuti" value={loading ? '…' : annualBalance === null ? '—' : `${annualBalance} hari`} icon={CalendarDays} href="/employee/leave" />
          <CompactMetric label="Saldo PHL" value={loading ? '…' : `${phlBalance} hari`} icon={WalletCards} href="/employee/phl" accent="green" />
          <CompactMetric label="Pengajuan Pending" value={loading ? '…' : pendingRequestCount} icon={Clock3} href="/employee/leave" accent="amber" />
          <CompactMetric label="Hari Tercatat" value={loading ? '…' : recordedAttendance} icon={CheckCircle2} href="/employee/attendance" />
        </div>
        <WorkspaceActions title="Akses cepat karyawan" actions={[
          {label:'Ajukan Cuti / Izin',description:'Buat pengajuan baru',href:'/employee/leave',icon:CalendarDays,emphasis:true},
          {label:'Ajukan Saldo PHL',description:'Lihat saldo & pengajuan',href:'/employee/phl',icon:WalletCards},
          {label:'Biodata & Dokumen',description:'Perbarui profil pribadi',href:'/employee/account',icon:Fingerprint},
        ]} />
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="harmony-unified-surface harmony-glass-activity-panel overflow-hidden rounded-[22px]">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 px-4 py-3"><h2 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900"><History size={16} className="text-blue-600" /> Aktivitas Terbaru</h2><Link href="/employee/leave" className="text-xs font-semibold text-blue-700">Lihat pengajuan</Link></div>
            <div className="divide-y divide-slate-200/40">
              {loading ? <EmptyRow text="Memuat..."/> : requests.length === 0 ? <EmptyRow text="Belum ada aktivitas."/> : requests.slice(0, 5).map(item => <div key={`${item.type}-${item.id}`} className="flex min-h-[58px] items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{item.label}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{item.date}</p></div><Status status={item.status}/>
              </div>)}
            </div>
          </section>
          <details className="harmony-unified-surface overflow-hidden rounded-[22px]" open={false}>
            <summary className="flex cursor-pointer items-center justify-between border-b border-slate-200/50 px-4 py-3 text-sm font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500">Detail Saldo <span className="text-xs font-medium text-blue-700">Buka detail ↓</span></summary>
            <div className="space-y-1.5 p-3">
              <InfoRow label="Postpone aktif" value={`${Number(balance?.postpone_active_days || 0)} hari`} />
              {debtOutstandingDays > 0 && <InfoRow label="Hutang cuti" value={`${debtOutstandingDays} hari`}/>}
              {debtOutstandingDays > 0 && <InfoRow label="Target pelunasan" value={formatDate(debtNextMaturity)}/>}
              <InfoRow label="Masa berlaku Postpone" value={formatDate(balance?.next_postpone_expiry)}/>
              <InfoRow label="Masa berlaku PHL" value={formatDate(balance?.next_phl_expiry)}/>
            </div>
          </details>
        </div>
        <TodayTeamAvailability />
      </section>
    </>
  )
}

function RequestTypeIcon({
  type,
}: {
  type: RequestItem['type']
}) {
  if (type === 'debt') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
        <History size={17} />
      </div>
    )
  }

  if (type === 'phl') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Plane size={17} />
      </div>
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
      <FileText size={17} />
    </div>
  )
}

function labelDebtStatus(value: unknown) {
  const status = normalizeStatus(value)
  if (status === 'settled') return 'Lunas'
  if (status === 'partially_applied') return 'Sebagian Terbayar'
  if (status === 'cancelled') return 'Dibatalkan'
  return 'Menunggu Pelunasan'
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function normalizeStatus(value: unknown) { return String(value || '').trim().toLowerCase() }
function labelRequestType(value: unknown) {
  const key = normalizeStatus(value)
  const map: Record<string, string> = { annual_leave: 'Cuti Tahunan', sick: 'Sakit', permit: 'Izin', official_travel: 'Tugas Luar' }
  return map[key] || String(value || 'Pengajuan').replace(/_/g, ' ')
}
function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
function Status({ status }: { status: string }) {
  const normalized = normalizeStatus(status)
  const cls =
    normalized.includes('disetujui') || normalized === 'lunas'
      ? 'bg-green-50 text-green-700'
      : normalized.includes('ditolak') || normalized.includes('dibatalkan')
        ? 'bg-red-50 text-red-700'
        : normalized.includes('hr')
          ? 'bg-blue-50 text-blue-700'
          : 'bg-orange-50 text-orange-700'

  return (
    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>
      {status || 'Menunggu Atasan'}
    </span>
  )
}
function Metric({ title, value, description, icon, tone }: { title: string; value: string; description: string; icon: ReactNode; tone: 'blue'|'purple'|'green'|'orange' }) {
  const map = { blue: 'bg-blue-50 text-blue-700', purple: 'bg-violet-50 text-violet-700', green: 'bg-green-50 text-green-700', orange: 'bg-orange-50 text-orange-700' }
  return <div className="harmony-card p-5"><div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${map[tone]}`}>{icon}</div><p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#86868b]">{title}</p><p className="mt-1 text-3xl font-semibold tracking-tight text-[#1d1d1f]">{value}</p><p className="mt-1 text-xs leading-5 text-[#6e6e73]">{description}</p></div>
}
function MiniInfo({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-black/10 p-3"><p className="text-[10px] font-bold text-white/40">{label}</p><p className="mt-1 truncate font-semibold text-white/90">{value}</p></div> }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3"><span className="text-xs font-semibold text-[#6e6e73]">{label}</span><span className="text-right text-xs font-bold text-[#1d1d1f]">{value}</span></div> }
function EmptyRow({ text }: { text: string }) { return <div className="p-6 text-center text-sm text-[#6e6e73]">{text}</div> }
