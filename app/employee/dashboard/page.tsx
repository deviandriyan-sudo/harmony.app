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
  Plane,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react'

import { TodayTeamAvailability } from '@/components/employee/TodayTeamAvailability'
import { Topbar } from '@/components/layout/Topbar'
import { getCurrentPeriodMonthWita, getCutoffRange } from '@/lib/attendance-reporting'
import { supabase } from '@/lib/supabase'

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
  type: 'leave' | 'phl'
  label: string
  date: string
  status: string
  reason: string
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

      const [balanceResponse, attendanceResponse, leaveResponse, phlResponse] = await Promise.all([
        supabase
          .from('harmony_leave_balance_summary')
          .select('employee_id,annual_total_available_days,phl_total_available_days,postpone_active_days,postpone_expired_days,next_postpone_expiry,next_phl_expiry')
          .eq('employee_id', employeeData.id)
          .maybeSingle<BalanceSummary>(),
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
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('phl_records')
          .select('id,phl_date,status,supervisor_status,hr_status,reason,created_at')
          .eq('employee_id', employeeData.id)
          .eq('source', 'employee_phl_claim')
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      if (!balanceResponse.error) setBalance(balanceResponse.data || null)
      else setBalance(null)

      if (attendanceResponse.error) throw attendanceResponse.error
      setAttendance((attendanceResponse.data || []) as AttendanceRow[])

      const leaveItems: RequestItem[] = (leaveResponse.data || []).map((row: any) => ({
        id: row.id,
        type: 'leave',
        label: row.leave_type || labelRequestType(row.request_type),
        date: row.start_date && row.end_date && row.start_date !== row.end_date ? `${formatDate(row.start_date)} – ${formatDate(row.end_date)}` : formatDate(row.start_date),
        status: normalizeStatus(row.hr_status || row.supervisor_status || row.status),
        reason: row.reason || '-',
      }))

      const phlItems: RequestItem[] = (phlResponse.data || []).map((row: any) => ({
        id: row.id,
        type: 'phl',
        label: 'Klaim PHL',
        date: formatDate(row.phl_date),
        status: normalizeStatus(row.hr_status || row.supervisor_status || row.status),
        reason: row.reason || '-',
      }))

      setRequests([...leaveItems, ...phlItems].slice(0, 8))
    } catch (error: any) {
      setMessage(error?.message || 'Dashboard employee gagal dimuat.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const recordedAttendance = attendance.filter((row) => Boolean(row.check_in || row.check_out || row.manual_check_in || row.manual_check_out)).length
  const pendingRequests = requests.filter((item) => ['pending', 'submitted', 'waiting_hr', 'pending_hr', 'pending_supervisor'].includes(item.status)).length
  const annualBalance = Number(balance?.annual_total_available_days ?? employee?.annual_leave_balance ?? 0)
  const phlBalance = Number(balance?.phl_total_available_days ?? employee?.phl_balance ?? 0)

  return (
    <>
      <Topbar title="Beranda Employee" description="Ringkasan saldo, absensi, pengajuan, dan informasi kehadiran tim dari source HARMONY yang sama." />

      <section className="harmony-page-bg min-h-screen space-y-5 overflow-x-hidden p-4 sm:p-6">
        {message && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-700">
            <div className="flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{message}</span></div>
          </div>
        )}

        <section className="harmony-glass-dark relative overflow-hidden rounded-[30px] p-6 text-white sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#007aff]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-8 h-60 w-60 rounded-full bg-[#af52de]/20 blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[1.25fr_0.75fr] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/75"><Sparkles size={13} />HARMONY · Employee Self Service</div>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Selamat datang, {employee?.full_name || appUser?.email || 'Employee'}.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">Saldo cuti dan PHL pada dashboard ini membaca lifecycle summary yang sama dengan HR agar tidak terjadi perbedaan angka.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/employee/leave" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-[#1d1d1f]"><CalendarDays size={17} />Ajukan Cuti / PHL</Link>
                <Link href="/employee/attendance" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-bold text-white"><Fingerprint size={17} />Absensi</Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-white/45">PERIODE BERJALAN</p><p className="mt-1 text-sm font-semibold">{periodRange.label}</p></div><ShieldCheck size={20} className="text-[#9ff2b5]" /></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <MiniInfo label="NIP" value={employee?.employee_number || '-'} />
                <MiniInfo label="Unit" value={employee?.department || '-'} />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Saldo Cuti" value={`${annualBalance}`} description="Cuti matang + postpone aktif" icon={<WalletCards size={20} />} tone="blue" />
          <Metric title="Saldo PHL" value={`${phlBalance}`} description="PHL aktif yang dapat diklaim" icon={<Plane size={20} />} tone="purple" />
          <Metric title="Kehadiran Tercatat" value={`${recordedAttendance}`} description="Periode cut-off berjalan" icon={<CheckCircle2 size={20} />} tone="green" />
          <Metric title="Pending Request" value={`${pendingRequests}`} description="Cuti/izin/PHL belum final" icon={<Clock3 size={20} />} tone="orange" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="harmony-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/5 p-5">
              <div><h2 className="font-bold text-[#1d1d1f]">Pengajuan Terbaru</h2><p className="mt-1 text-xs text-[#6e6e73]">Leave dari leave_requests · Klaim PHL dari phl_records.</p></div>
              <Link href="/employee/leave" className="text-xs font-bold text-[#007aff]">Lihat semua</Link>
            </div>
            <div className="divide-y divide-black/5">
              {loading ? <EmptyRow text="Memuat pengajuan..." /> : requests.length === 0 ? <EmptyRow text="Belum ada pengajuan." /> : requests.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex gap-3 p-4 sm:p-5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.type === 'phl' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{item.type === 'phl' ? <Plane size={17} /> : <FileText size={17} />}</div>
                  <div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-bold text-[#1d1d1f]">{item.label}</p><Status status={item.status} /></div><p className="mt-1 text-xs text-[#6e6e73]">{item.date}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6e6e73]">{item.reason}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="harmony-card p-5">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-[#1d1d1f]">Lifecycle Saldo</h2><p className="mt-1 text-xs text-[#6e6e73]">Informasi dari summary database.</p></div><button type="button" onClick={fetchDashboardData} disabled={refreshing} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm disabled:opacity-50"><RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} /></button></div>
            <div className="mt-4 space-y-3">
              <InfoRow label="Postpone aktif" value={`${Number(balance?.postpone_active_days || 0)} hari`} />
              <InfoRow label="Postpone expired" value={`${Number(balance?.postpone_expired_days || 0)} hari`} />
              <InfoRow label="Expiry Postpone terdekat" value={formatDate(balance?.next_postpone_expiry)} />
              <InfoRow label="Expiry PHL terdekat" value={formatDate(balance?.next_phl_expiry)} />
            </div>
            <Link href="/employee/settings" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#f5f5f7] px-4 text-xs font-bold text-[#1d1d1f]"><Settings size={15} />Pengaturan akun</Link>
          </section>
        </div>

        <TodayTeamAvailability />
      </section>
    </>
  )
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
  const cls = ['approved', 'finalized'].includes(normalized) ? 'bg-green-50 text-green-700' : ['rejected', 'cancelled'].includes(normalized) ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
  return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>{normalized ? normalized.replace(/_/g, ' ') : 'pending'}</span>
}
function Metric({ title, value, description, icon, tone }: { title: string; value: string; description: string; icon: ReactNode; tone: 'blue'|'purple'|'green'|'orange' }) {
  const map = { blue: 'bg-blue-50 text-blue-700', purple: 'bg-violet-50 text-violet-700', green: 'bg-green-50 text-green-700', orange: 'bg-orange-50 text-orange-700' }
  return <div className="harmony-card p-5"><div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${map[tone]}`}>{icon}</div><p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#86868b]">{title}</p><p className="mt-1 text-3xl font-semibold tracking-tight text-[#1d1d1f]">{value}</p><p className="mt-1 text-xs leading-5 text-[#6e6e73]">{description}</p></div>
}
function MiniInfo({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-black/10 p-3"><p className="text-[10px] font-bold text-white/40">{label}</p><p className="mt-1 truncate font-semibold text-white/90">{value}</p></div> }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3"><span className="text-xs font-semibold text-[#6e6e73]">{label}</span><span className="text-right text-xs font-bold text-[#1d1d1f]">{value}</span></div> }
function EmptyRow({ text }: { text: string }) { return <div className="p-6 text-center text-sm text-[#6e6e73]">{text}</div> }
