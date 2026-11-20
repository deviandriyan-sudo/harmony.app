'use client'


import { readErrorMessage } from '@/lib/error-utils'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, HeartPulse, RefreshCcw, WalletCards } from 'lucide-react'

import { TodayTeamAvailability } from '@/components/employee/TodayTeamAvailability'
import { Topbar } from '@/components/layout/Topbar'
import { CompactMetric } from '@/components/dashboard/CompactMetric'
import { getCurrentPeriodMonthWita, getCutoffRange } from '@/lib/attendance-reporting'
import { supabase } from '@/lib/supabase'
import { harmonyFetch } from '@/lib/harmony-client'
import { getApprovalStageLabel } from '@/lib/leave-workflow-status'
import { witaToday } from '@/lib/dashboard-monitoring'

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
  balance_integrity_status?: 'ok' | 'mismatch' | 'summary_only'
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
  const [attendancePeriodStatus, setAttendancePeriodStatus] = useState<string | null>(null)
  const [remedAvailable, setRemedAvailable] = useState<number | null>(null)
  const [supervisorApprovals, setSupervisorApprovals] = useState<{items:{id:string;name:string;category:string;date:string;href:string;status:string}[];total:number}|null>(null)
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
      // Optional read-only dashboard summaries; failure must never block salary,
      // leave balance, attendance or existing request workflows.
      const [attendanceSummary, remedSummary, supervisorSummary] = await Promise.allSettled([
        supabase.from('attendance_period_confirmations').select('employee_status,supervisor_status,hr_status,is_locked').eq('employee_id',employeeData.id).eq('period_month',periodMonth).maybeSingle(),
        harmonyFetch<{entitlement?:{available_amount?:number}|null}>('/api/remed/dashboard'),
        harmonyFetch<{items:{id:string;name:string;category:string;date:string;href:string;status:string}[];total:number}>('/api/employee/dashboard/approval-summary'),
      ])
      setAttendancePeriodStatus(attendanceSummary.status==='fulfilled' && !attendanceSummary.value.error
        ? (attendanceSummary.value.data?.is_locked ? 'Final' : attendanceSummary.value.data?.employee_status||'Belum konfirmasi') : null)
      setRemedAvailable(remedSummary.status==='fulfilled' && remedSummary.value.entitlement
        ? Number(remedSummary.value.entitlement.available_amount??0) : null)
      setSupervisorApprovals(supervisorSummary.status==='fulfilled'?supervisorSummary.value:null)

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

      const leaveItems: RequestItem[] = (leaveResponse.data || []).map((row) => ({
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

      const phlItems: RequestItem[] = (phlResponse.data || []).map((row) => ({
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
    } catch (error: unknown) {
      setMessage(readErrorMessage(error) || 'Dashboard employee gagal dimuat.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const recordedAttendance = attendance.filter(row=>Boolean(row.check_in || row.check_out || row.manual_check_in || row.manual_check_out)).length
  const annualBalance = balance ? Number(balance.annual_total_available_days ?? 0) : null
  const phlBalance = Number(balance?.phl_total_available_days ?? employee?.phl_balance ?? 0)
  const rejectedRequests = requests.filter(item=>/ditolak/i.test(item.status))
  const expiryDate=balance?.next_phl_expiry || null
  const phlExpiryDays=expiryDate?Math.ceil((Date.parse(expiryDate+'T00:00:00Z')-Date.parse(witaToday()+'T00:00:00Z'))/86400000):null
  const tasks = [
    ...(attendancePeriodStatus && !['submitted','approved','Final'].includes(attendancePeriodStatus)
      ? [{key:'attendance',title:'Konfirmasi absensi belum selesai',hint:`Periode ${periodRange.label}`,href:'/employee/attendance'}] : []),
    ...rejectedRequests.slice(0,2).map(item=>({key:`${item.type}-${item.id}`,title:`Periksa pengajuan ${item.label}`,hint:'Pengajuan ditolak, periksa alasan dan ketentuannya',href:item.type==='phl'?'/employee/phl':'/employee/leave'})),
    ...(phlExpiryDays!==null && phlExpiryDays>=0 && phlExpiryDays<=14 && phlBalance>0 ? [{key:'phl-expiry',title:'Periksa masa berlaku saldo PHL',hint:`Berlaku hingga ${formatDate(expiryDate)}`,href:'/employee/phl'}] : []),
  ].slice(0,5)
  return <>
    <Topbar title="Beranda" compact />
    <main className="harmony-rc2o harmony-rc2o-employee harmony-glass-showcase mx-auto max-w-[1500px] space-y-4 p-4 sm:p-5 lg:p-6">
      {message&&<div role="alert" className="harmony-rc2o-error flex items-center gap-2 rounded-2xl p-3 text-sm"><AlertTriangle size={16}/>{message}</div>}
      <section className="harmony-rc2o-hero flex min-h-[140px] flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-7">
        <div className="relative z-10 min-w-0"><p className="harmony-rc2o-hero-kicker">PERSONAL EMPLOYEE WORKSPACE</p><h1 className="mt-1 text-[24px] font-bold tracking-tight sm:text-[28px]">Selamat datang kembali, <span>{employee?.full_name || appUser?.email || 'Karyawan'}</span></h1><p className="mt-1 text-sm">Pantau pekerjaan, pengajuan, dan informasi kepegawaian Anda dalam satu tempat.</p><p className="mt-2 text-xs opacity-80">{employee?.department||'Unit kerja belum tersedia'} · {periodRange.label} · {attendancePeriodStatus ? `Absensi: ${attendancePeriodStatus}`:'Status konfirmasi diperiksa di menu Absensi'}</p></div>
        <div className="relative z-10 flex flex-wrap gap-2"><Link href="#harmony-perlu-tindakan" className="harmony-rc2o-hero-button inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold">Lihat Tugas Saya <ArrowRight size={14}/></Link><Link href="/employee/leave" className="harmony-rc2o-hero-button inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold">Ajukan Cuti / Izin</Link><button type="button" onClick={()=>void fetchDashboardData()} disabled={refreshing} aria-label="Refresh dashboard" className="harmony-rc2o-hero-button flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-60"><RefreshCcw size={16} className={refreshing?'animate-spin':''}/></button></div>
      </section>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-busy={loading}>
        <CompactMetric label="Saldo Cuti" value={loading?'…':annualBalance===null?'—':`${annualBalance} hari`} icon={CalendarDays} href="/employee/leave"/>
        <CompactMetric label="Saldo PHL" value={loading?'…':`${phlBalance} hari`} icon={WalletCards} href="/employee/phl" accent="green"/>
        <CompactMetric label="Status Kehadiran" value={loading?'…':attendancePeriodStatus||`${recordedAttendance} tercatat`} icon={CheckCircle2} href="/employee/attendance"/>
        <CompactMetric label="Re-Med" value={loading?'…':remedAvailable===null?'Lihat hak':`Rp ${new Intl.NumberFormat('id-ID',{notation:'compact',maximumFractionDigits:1}).format(remedAvailable)}`} icon={HeartPulse} href="/remed/employee/dashboard" accent="amber"/>
      </div>
      <section id="harmony-perlu-tindakan" className="harmony-rc2o-panel scroll-mt-24 overflow-hidden"><div className="p-4 sm:p-5"><h2 className="harmony-rc2o-panel-title">Perlu Tindakan</h2><p className="harmony-rc2o-muted mt-1 text-xs">Hanya hal yang membutuhkan perhatian atau pengecekan Anda.</p></div><div className="harmony-rc2o-divider"/>
        {loading?<p role="status" className="harmony-rc2o-muted p-5 text-sm">Memuat tindakan...</p>:tasks.length===0?<p className="harmony-rc2o-muted p-5 text-sm">Tidak ada tugas mendesak yang terdeteksi. Pengajuan tetap tersedia melalui menu utama.</p>:tasks.map(task=><Link key={task.key} href={task.href} className="harmony-rc2o-row flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0"><span className="min-w-0"><span className="harmony-rc2o-strong block truncate text-sm font-semibold">{task.title}</span><span className="harmony-rc2o-muted block truncate text-xs">{task.hint}</span></span><ArrowRight size={17} className="harmony-rc2o-link shrink-0"/></Link>)}
      </section>
      {supervisorApprovals && supervisorApprovals.total>0 && <section className="harmony-rc2o-panel overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-2 p-4 sm:p-5"><div><h2 className="harmony-rc2o-panel-title">Informasi & Approval Tim</h2><p className="harmony-rc2o-muted mt-1 text-xs">{supervisorApprovals.total} pengajuan bawahan memerlukan review Anda.</p></div><Link href="/employee/approvals" className="harmony-rc2o-link text-xs font-semibold">Buka Approval Tim →</Link></div><div className="harmony-rc2o-divider"/>{supervisorApprovals.items.map(item=><div key={item.id} className="harmony-rc2o-row flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0"><div className="min-w-[160px] flex-1"><p className="harmony-rc2o-strong truncate text-sm font-semibold">{item.name}</p><p className="harmony-rc2o-muted mt-0.5 text-xs">{item.category} · {item.date}</p></div><div className="flex shrink-0 gap-2"><Link href={item.href} aria-label={`Tinjau persetujuan ${item.name}`} className="harmony-rc2o-approve rounded-xl px-3 py-2 text-xs font-semibold">Setujui</Link><Link href={item.href} aria-label={`Tinjau penolakan ${item.name}`} className="harmony-rc2o-reject rounded-xl px-3 py-2 text-xs font-semibold">Tolak</Link></div></div>)}<p className="harmony-rc2o-muted border-t px-4 py-3 text-xs">Kedua tombol membuka halaman Approval Tim. Konfirmasi Setujui/Tolak tetap dilakukan pada formulir approval existing, tidak otomatis dari dashboard.</p></section>}
      <details className="harmony-rc2o-panel overflow-hidden"><summary className="harmony-rc2o-strong flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold">Informasi Saldo Lainnya <span className="harmony-rc2o-link text-xs">Lihat detail ↓</span></summary><div className="harmony-rc2o-divider"/><div className="grid gap-3 p-4 sm:grid-cols-2"><InfoRow label="Postpone aktif" value={`${Number(balance?.postpone_active_days||0)} hari`}/>{debtOutstandingDays>0&&<InfoRow label="Hutang cuti" value={`${debtOutstandingDays} hari`}/>}{debtOutstandingDays>0&&<InfoRow label="Target pelunasan" value={formatDate(debtNextMaturity)}/>}<InfoRow label="Masa berlaku PHL" value={formatDate(balance?.next_phl_expiry)}/><Link href="/employee/phl" className="harmony-rc2o-link flex items-center gap-2 p-3 text-xs font-semibold">Ajukan Saldo PHL <ArrowRight size={14}/></Link></div></details>
      <TodayTeamAvailability/>
    </main>
  </>
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

function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3"><span className="text-xs font-semibold harmony-text-secondary">{label}</span><span className="text-right text-xs font-bold harmony-text-primary">{value}</span></div> }
