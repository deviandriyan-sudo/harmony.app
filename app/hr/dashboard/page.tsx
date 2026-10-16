'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CalendarDays, Clock3, RefreshCcw, Upload, UserCheck, Users } from 'lucide-react'
import { CompactMetric } from '@/components/dashboard/CompactMetric'
import { Topbar } from '@/components/layout/Topbar'
import { getCurrentPeriodMonthWita, getCutoffRange } from '@/lib/attendance-reporting'
import { supabase } from '@/lib/supabase'

type Row = Record<string, unknown>
type Data = { employees: Row[]; confirmations: Row[]; leave: Row[] }
const OrganizationChart = dynamic(() => import('@/components/organization/GeneralOrganizationChart').then(mod => mod.GeneralOrganizationChart), { ssr: false })
const empty: Data = { employees: [], confirmations: [], leave: [] }
const clean = (value: unknown) => String(value || '').toLowerCase().trim().replace(/\s+/g, '_')
const approved = (status: unknown) => ['approved','approve','accepted','disetujui','ready_for_hr','ready-for-hr'].includes(clean(status))
const submitted = (status: unknown) => ['submitted','submit','sent','pending','menunggu','diajukan','ready_for_supervisor','ready-for-supervisor'].includes(clean(status))
const finished = (row: Row) => Boolean(row.is_locked || row.hr_finalized_at || ['finalized','finalised','locked'].includes(clean(row.hr_status)))

export default function HRDashboardPage() {
  const periodMonth = useMemo(() => getCurrentPeriodMonthWita(), [])
  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])
  const [data, setData] = useState<Data>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [showOrg, setShowOrg] = useState(false)

  async function load() {
    try {
      // Only the three datasets used by this action-focused dashboard.
      const [employees, confirmations, leave] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('attendance_period_confirmations').select('employee_id,employee_status,supervisor_status,hr_status,hr_finalized_at,is_locked').eq('period_month', periodMonth),
        supabase.from('leave_requests').select('id,request_type,status,supervisor_status,hr_status,created_at').order('created_at',{ascending:false}),
      ])
      if (employees.error || confirmations.error || leave.error) throw employees.error || confirmations.error || leave.error
      setError('')
      setData({employees: employees.data || [], confirmations: confirmations.data || [], leave: (leave.data || []).filter(row => clean(row.request_type) !== 'phl_claim')})
    } catch (issue: unknown) { setError(issue instanceof Error ? issue.message : 'Data beranda tidak dapat dimuat.') }
    finally { setLoading(false); setRefreshing(false) }
  }
  useEffect(() => { queueMicrotask(() => { void load() }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const metrics = useMemo(() => {
    const active = data.employees.filter(row => row.is_active !== false && !['inactive','nonactive','non_aktif','resign','resigned','terminated','keluar'].some(s => [row.status,row.employee_status,row.employment_status,row.work_status].map(clean).includes(s)))
    const ids = new Set(active.map(row => row.id))
    const confirmations = data.confirmations.filter(row => ids.has(row.employee_id))
    const sent = new Set(confirmations.filter(row => finished(row) || submitted(row.employee_status) || approved(row.supervisor_status)).map(row => row.employee_id))
    const pending = confirmations.filter(row => !finished(row) && submitted(row.employee_status) && !approved(row.supervisor_status) && !['rejected','reject','ditolak'].includes(clean(row.supervisor_status))).length
    const ready = confirmations.filter(row => !finished(row) && (approved(row.supervisor_status) || clean(row.hr_status) === 'ready_for_hr')).length
    const leave = data.leave.filter(row => [row.status,row.supervisor_status,row.hr_status].some(s => ['pending','waiting','submitted','process','review','menunggu','diajukan'].some(flag => clean(s).includes(flag))) && !['approved','rejected','ditolak','finalized','cancelled'].includes(clean(row.status))).length
    return { active: active.length, notSubmitted: Math.max(0, active.length - sent.size), pending, ready, leave }
  }, [data])

  const alertItems = [
    { label: 'Menunggu approval atasan', value: metrics.pending, href: '/hr/attendance/approvals' },
    { label: 'Siap diperiksa HR', value: metrics.ready, href: '/hr/attendance/approvals' },
    { label: 'Belum submit absensi', value: metrics.notSubmitted, href: '/hr/attendance/data' },
    { label: 'Pengajuan cuti/izin diproses', value: metrics.leave, href: '/hr/leave' },
  ]
  return <>
    <Topbar title="Beranda HR" />
    <section className="harmony-page-bg mx-auto min-h-screen max-w-[1500px] space-y-4 p-4 sm:p-5 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold tracking-tight text-slate-900">Ringkasan HR</h1><p className="mt-0.5 text-xs text-slate-500">Periode {range.label}</p></div>
        <button type="button" onClick={() => { setRefreshing(true); void load() }} disabled={refreshing} className="harmony-button-secondary inline-flex min-h-10 items-center gap-2 px-3 text-xs" aria-label="Perbarui ringkasan"><RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button>
      </header>
      {error && <p role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertTriangle size={16} />{error}</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <CompactMetric label="Karyawan Aktif" value={loading ? '…' : metrics.active} icon={Users} href="/hr/employees" />
        <CompactMetric label="Approval Atasan" value={loading ? '…' : metrics.pending} icon={UserCheck} href="/hr/attendance/approvals" accent="amber" />
        <CompactMetric label="Belum Submit" value={loading ? '…' : metrics.notSubmitted} icon={Clock3} href="/hr/attendance/data" accent="amber" />
        <CompactMetric label="Cuti/Izin Diproses" value={loading ? '…' : metrics.leave} icon={CalendarDays} href="/hr/leave" accent="green" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/hr/attendance/upload" className="harmony-button-primary inline-flex min-h-10 items-center gap-2 px-4 text-xs"><Upload size={15} /> Upload Absensi</Link>
        <Link href="/hr/attendance/approvals" className="harmony-button-secondary inline-flex min-h-10 items-center gap-2 px-4 text-xs"><UserCheck size={15} /> Review Approval</Link>
        <Link href="/hr/employees" className="harmony-button-secondary inline-flex min-h-10 items-center gap-2 px-4 text-xs"><Users size={15} /> Data Karyawan</Link>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="harmony-unified-surface overflow-hidden rounded-[22px]">
          <h2 className="border-b border-slate-200/50 px-4 py-3 text-sm font-bold text-slate-900">Perlu Tindakan</h2>
          <div className="divide-y divide-slate-200/40">
            {alertItems.map(item => <Link key={item.label} href={item.href} className="flex min-h-[53px] items-center justify-between gap-3 px-4 py-2 text-xs text-slate-700 hover:bg-white/55">
              <span className="font-medium">{item.label}</span><span className="flex shrink-0 items-center gap-2"><strong className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700">{loading ? '…' : item.value}</strong><ArrowUpRight size={15} /></span>
            </Link>)}
          </div>
        </section>
        <section className="harmony-unified-surface overflow-hidden rounded-[22px]">
          <h2 className="border-b border-slate-200/50 px-4 py-3 text-sm font-bold text-slate-900">Modul</h2>
          <div className="grid grid-cols-2 gap-2 p-3">
            {[{name:'SDM',href:'/hr/employees'},{name:'Absensi',href:'/hr/attendance'},{name:'Cuti & Izin',href:'/hr/leave'},{name:'Saldo PHL',href:'/hr/phl'},{name:'Kalender',href:'/hr/holidays'},{name:'Sistem',href:'/hr/settings'}].map(item =>
              <Link key={item.href} href={item.href} className="flex min-h-11 items-center justify-between rounded-xl border border-white/80 bg-white/60 px-3 text-xs font-semibold text-slate-700 transition hover:bg-blue-50">{item.name}<ArrowUpRight size={14} /></Link>
            )}
          </div>
        </section>
      </div>
      <div className="harmony-unified-surface overflow-hidden rounded-[20px]">
        <button type="button" onClick={() => setShowOrg(value => !value)} aria-expanded={showOrg} className="flex min-h-11 w-full items-center justify-between px-4 text-xs font-semibold text-slate-700 hover:bg-white/60"><span>Struktur Organisasi</span><span>{showOrg ? 'Tutup −' : 'Lihat +'}</span></button>
        {showOrg && <div className="border-t border-slate-200/50 p-3"><OrganizationChart /></div>}
      </div>
    </section>
  </>
}
