'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Landmark,
  Loader2,
  Plane,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type ActiveTab = 'leave' | 'phl-claim' | 'phl-balance' | 'history'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

type LeaveRequest = {
  id: string
  employee_id: string | null
  employee_number?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null

  request_type?: string | null
  leave_type?: string | null
  start_date?: string | null
  end_date?: string | null
  total_days?: number | null
  reason?: string | null

  status?: string | null

  supervisor_status?: string | null
  supervisor_approved_by?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_by?: string | null
  supervisor_rejected_at?: string | null
  supervisor_note?: string | null

  hr_status?: string | null
  hr_approved_by?: string | null
  hr_approved_at?: string | null
  hr_note?: string | null

  proof_url?: string | null
  proof_file_url?: string | null
  proof_file_name?: string | null

  job_pending_summary?: string | null
  job_pending_detail?: string | null
  handover_to_employee_id?: string | null
  handover_to_employee_number?: string | null
  handover_to_full_name?: string | null
  handover_to_department?: string | null
  handover_to_position?: string | null
  handover_note?: string | null
  emergency_contact_during_leave?: string | null
  is_handover_required?: boolean | null
  handover_status?: string | null

  submitted_by?: string | null
  submitted_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type PHLRecord = {
  id: string
  source_attendance_log_id?: string | null
  employee_id: string | null
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null

  phl_date?: string | null
  valid_from?: string | null
  expired_at?: string | null

  reason?: string | null
  source?: string | null
  status?: string | null

  balance_days?: number | null
  used_days?: number | null
  remaining_days?: number | null

  proof_file_url?: string | null
  proof_file_name?: string | null

  approved_by?: string | null
  approved_at?: string | null

  supervisor_status?: string | null
  supervisor_approved_by?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_by?: string | null
  supervisor_rejected_at?: string | null
  supervisor_note?: string | null

  hr_status?: string | null
  hr_approved_by?: string | null
  hr_approved_at?: string | null
  hr_note?: string | null

  job_pending_summary?: string | null
  job_pending_detail?: string | null
  handover_to_employee_id?: string | null
  handover_to_employee_number?: string | null
  handover_to_full_name?: string | null
  handover_to_department?: string | null
  handover_to_position?: string | null
  handover_note?: string | null
  emergency_contact_during_leave?: string | null
  is_handover_required?: boolean | null
  handover_status?: string | null

  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type PHLBalanceSummary = {
  employee_id: string | null
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  total_earned_days: number | null
  total_used_days: number | null
  total_available_days: number | null
  pending_claim_count: number | null
}

type DeleteTarget = {
  id: string
  kind: 'leave' | 'phl'
  title: string
  employeeName: string
  description: string
}

export default function HRLeavePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('leave')

  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [phlRecords, setPHLRecords] = useState<PHLRecord[]>([])
  const [phlBalanceSummary, setPHLBalanceSummary] = useState<PHLBalanceSummary[]>([])

  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null)
  const [selectedPHLRecord, setSelectedPHLRecord] = useState<PHLRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const [rejectPHLRecord, setRejectPHLRecord] = useState<PHLRecord | null>(null)
  const [rejectPHLReason, setRejectPHLReason] = useState('')

  const [rejectLeaveRecord, setRejectLeaveRecord] = useState<LeaveRequest | null>(null)
  const [rejectLeaveReason, setRejectLeaveReason] = useState('')

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const phlClaims = useMemo(() => {
    return phlRecords.filter((item) => item.source === 'employee_phl_claim')
  }, [phlRecords])

  const phlBalances = useMemo(() => {
    return phlRecords.filter((item) => item.source === 'attendance_phl_approved')
  }, [phlRecords])

  const pendingPHLClaims = phlClaims.filter((item) => {
    const status = normalizeStatus(item.status)

    return (
      status === 'pending' ||
      status === 'submitted' ||
      status === 'waiting_hr'
    )
  })

  const approvedPHLClaims = phlClaims.filter((item) => {
    return normalizeStatus(item.status) === 'approved'
  })

  const rejectedPHLClaims = phlClaims.filter((item) => {
    return normalizeStatus(item.status) === 'rejected'
  })

  const pendingLeaveRequests = leaveRequests.filter((item) => {
    const status = normalizeStatus(item.hr_status || item.status || item.supervisor_status)

    return (
      status === 'pending' ||
      status === 'waiting_supervisor' ||
      status === 'waiting_hr' ||
      status === 'submitted'
    )
  })

  const filteredLeaveRequests = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return leaveRequests

    return leaveRequests.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.leave_type?.toLowerCase().includes(keyword) ||
        item.request_type?.toLowerCase().includes(keyword) ||
        item.reason?.toLowerCase().includes(keyword) ||
        item.status?.toLowerCase().includes(keyword) ||
        item.hr_status?.toLowerCase().includes(keyword) ||
        item.supervisor_status?.toLowerCase().includes(keyword) ||
        item.job_pending_summary?.toLowerCase().includes(keyword) ||
        item.job_pending_detail?.toLowerCase().includes(keyword) ||
        item.handover_to_full_name?.toLowerCase().includes(keyword)
      )
    })
  }, [leaveRequests, searchKeyword])

  const filteredPHLClaims = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return phlClaims

    return phlClaims.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.reason?.toLowerCase().includes(keyword) ||
        item.status?.toLowerCase().includes(keyword) ||
        item.hr_status?.toLowerCase().includes(keyword) ||
        item.supervisor_status?.toLowerCase().includes(keyword) ||
        item.job_pending_summary?.toLowerCase().includes(keyword) ||
        item.job_pending_detail?.toLowerCase().includes(keyword) ||
        item.handover_to_full_name?.toLowerCase().includes(keyword)
      )
    })
  }, [phlClaims, searchKeyword])

  const filteredPHLBalances = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return phlBalances

    return phlBalances.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.reason?.toLowerCase().includes(keyword)
      )
    })
  }, [phlBalances, searchKeyword])

  const filteredBalanceSummary = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return phlBalanceSummary

    return phlBalanceSummary.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword)
      )
    })
  }, [phlBalanceSummary, searchKeyword])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    setSelectedLeaveRequest(null)
    setSelectedPHLRecord(null)
    setDeleteTarget(null)
    setRejectPHLRecord(null)
    setRejectPHLReason('')
    setRejectLeaveRecord(null)
    setRejectLeaveReason('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage('Session HR belum ditemukan. Silakan login ulang.')
      setLoading(false)
      return
    }

    const { data: appUserData } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle<AppUser>()

    setAppUser(
      appUserData || {
        id: authData.user.id,
        email: authData.user.email || 'HR Administrator',
        role: 'hr',
        employee_id: null,
        is_active: true,
      }
    )

    await Promise.all([
      fetchLeaveRequests(),
      fetchPHLRecords(),
      fetchPHLBalanceSummary(),
    ])

    setLoading(false)
  }

  async function fetchLeaveRequests() {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setLeaveRequests([])
      return
    }

    setLeaveRequests(data || [])
  }

  async function fetchPHLRecords() {
    const { data, error } = await supabase
      .from('phl_records')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setPHLRecords([])
      return
    }

    setPHLRecords(data || [])
  }

  async function fetchPHLBalanceSummary() {
    const { data, error } = await supabase
      .from('employee_phl_balance_summary')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      setPHLBalanceSummary([])
      return
    }

    setPHLBalanceSummary(data || [])
  }

  async function approvePHLClaim(record: PHLRecord) {
    setProcessingId(record.id)
    setErrorMessage('')
    setSuccessMessage('')

    const approvedBy = appUser?.email || 'HR Administrator'

    const { data, error } = await supabase.rpc('approve_phl_claim', {
      p_claim_record_id: record.id,
      p_approved_by: approvedBy,
    })

    if (error) {
      setErrorMessage(error.message)
      setProcessingId('')
      return
    }

    const message = String(data || '')

    if (
      message.toLowerCase().includes('tidak') ||
      message.toLowerCase().includes('bukan') ||
      message.toLowerCase().includes('kurang') ||
      message.toLowerCase().includes('invalid') ||
      message.toLowerCase().includes('ditolak')
    ) {
      setErrorMessage(message)
      setProcessingId('')
      await fetchData()
      return
    }

    setSuccessMessage(message || 'Klaim PHL berhasil disetujui HR dan saldo PHL sudah dikurangi.')
    setProcessingId('')
    await fetchData()
  }

  async function rejectPHLClaim() {
    if (!rejectPHLRecord) return

    setProcessingId(rejectPHLRecord.id)
    setErrorMessage('')
    setSuccessMessage('')

    const rejectedBy = appUser?.email || 'HR Administrator'

    const { data, error } = await supabase.rpc('reject_phl_claim', {
      p_claim_record_id: rejectPHLRecord.id,
      p_rejected_by: rejectedBy,
      p_reason: rejectPHLReason,
    })

    if (error) {
      setErrorMessage(error.message)
      setProcessingId('')
      return
    }

    setSuccessMessage(String(data || 'Klaim PHL berhasil ditolak HR.'))
    setRejectPHLRecord(null)
    setRejectPHLReason('')
    setProcessingId('')
    await fetchData()
  }

  async function approveLeaveRequest(item: LeaveRequest) {
    setProcessingId(item.id)
    setErrorMessage('')
    setSuccessMessage('')

    const now = new Date().toISOString()
    const approvedBy = appUser?.email || 'HR Administrator'

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        hr_status: 'approved',
        hr_approved_by: approvedBy,
        hr_approved_at: now,
        hr_note: 'Disetujui oleh HR.',
        updated_at: now,
      })
      .eq('id', item.id)

    if (error) {
      setErrorMessage(error.message)
      setProcessingId('')
      return
    }

    if (item.employee_id && item.start_date && item.end_date) {
      const { error: syncError } = await supabase.rpc('sync_employee_absence_requests_to_attendance', {
        p_employee_id: item.employee_id,
        p_period_start: item.start_date,
        p_period_end: item.end_date,
      })

      if (syncError) {
        setErrorMessage(`Pengajuan disetujui HR, tetapi sinkron ke absensi gagal: ${syncError.message}`)
        setProcessingId('')
        await fetchData()
        return
      }
    }

    setSuccessMessage('Pengajuan cuti/izin berhasil disetujui HR dan disinkronkan ke absensi.')
    setProcessingId('')
    await fetchData()
  }

  async function rejectLeaveRequest() {
    if (!rejectLeaveRecord) return

    setProcessingId(rejectLeaveRecord.id)
    setErrorMessage('')
    setSuccessMessage('')

    const now = new Date().toISOString()
    const rejectedBy = appUser?.email || 'HR Administrator'

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        hr_status: 'rejected',
        hr_approved_by: rejectedBy,
        hr_approved_at: now,
        hr_note: rejectLeaveReason || 'Ditolak oleh HR.',
        updated_at: now,
      })
      .eq('id', rejectLeaveRecord.id)

    if (error) {
      setErrorMessage(error.message)
      setProcessingId('')
      return
    }

    setSuccessMessage('Pengajuan cuti/izin berhasil ditolak HR.')
    setRejectLeaveRecord(null)
    setRejectLeaveReason('')
    setProcessingId('')
    await fetchData()
  }

  function requestDeleteLeave(item: LeaveRequest) {
    setDeleteTarget({
      id: item.id,
      kind: 'leave',
      title: 'Hapus Pengajuan Cuti/Izin',
      employeeName: item.full_name || 'Karyawan',
      description:
        'Data pengajuan cuti/izin ini akan dihapus permanen dari database. Gunakan hanya untuk membersihkan data dummy atau data testing.',
    })
  }

  function requestDeletePHL(record: PHLRecord) {
    setDeleteTarget({
      id: record.id,
      kind: 'phl',
      title: 'Hapus Data PHL',
      employeeName: record.full_name || 'Karyawan',
      description:
        'Data PHL ini akan dihapus permanen dari database. Gunakan hanya untuk membersihkan data dummy atau data testing.',
    })
  }

  async function confirmDeleteTarget() {
    if (!deleteTarget) return

    setProcessingId(deleteTarget.id)
    setErrorMessage('')
    setSuccessMessage('')

    const tableName = deleteTarget.kind === 'leave' ? 'leave_requests' : 'phl_records'

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      setErrorMessage(error.message)
      setProcessingId('')
      return
    }

    setSuccessMessage(
      deleteTarget.kind === 'leave'
        ? 'Data pengajuan cuti/izin berhasil dihapus.'
        : 'Data PHL berhasil dihapus.'
    )

    setProcessingId('')
    setSelectedLeaveRequest(null)
    setSelectedPHLRecord(null)
    setDeleteTarget(null)

    await fetchData()
  }

  return (
    <>
      <Topbar
        title="Cuti, Izin & PHL"
        description="Kelola pengajuan cuti, izin, job pending, klaim PHL, dan saldo PHL karyawan."
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
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <ShieldCheck size={15} className="text-[#5ac8fa]" />
                HR Request Control
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Kelola Cuti, Izin & PHL
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Review pengajuan, cek job pending, approve klaim PHL, dan pantau saldo karyawan dalam satu halaman.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[660px]">
              <HeroMetric label="Pending Cuti/Izin" value={String(pendingLeaveRequests.length)} />
              <HeroMetric label="Pending Klaim PHL" value={String(pendingPHLClaims.length)} />
              <HeroMetric label="Approved Klaim" value={String(approvedPHLClaims.length)} />
              <HeroMetric label="Rejected Klaim" value={String(rejectedPHLClaims.length)} />
            </div>
          </div>
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === 'leave'}
                label="Pengajuan Cuti & Izin"
                icon={<CalendarDays size={17} />}
                onClick={() => setActiveTab('leave')}
              />

              <TabButton
                active={activeTab === 'phl-claim'}
                label="Approval Klaim PHL"
                icon={<Plane size={17} />}
                onClick={() => setActiveTab('phl-claim')}
              />

              <TabButton
                active={activeTab === 'phl-balance'}
                label="Saldo PHL"
                icon={<Landmark size={17} />}
                onClick={() => setActiveTab('phl-balance')}
              />

              <TabButton
                active={activeTab === 'history'}
                label="Riwayat"
                icon={<History size={17} />}
                onClick={() => setActiveTab('history')}
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-h-12 w-full items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm md:w-[340px]">
                <Search size={18} className="shrink-0 text-[#86868b]" />
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Cari nama, unit, job pending..."
                  className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                />
              </div>

              <button
                type="button"
                onClick={fetchData}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat data cuti, izin, dan PHL...
            </div>
          )}

          {!loading && activeTab === 'leave' && (
            <LeaveRequestTab
              requests={filteredLeaveRequests}
              processingId={processingId}
              onApprove={approveLeaveRequest}
              onReject={(item) => {
                setRejectLeaveRecord(item)
                setRejectLeaveReason('')
              }}
              onDelete={requestDeleteLeave}
              onDetail={setSelectedLeaveRequest}
            />
          )}

          {!loading && activeTab === 'phl-claim' && (
            <PHLClaimApprovalTab
              claims={filteredPHLClaims}
              processingId={processingId}
              onApprove={approvePHLClaim}
              onReject={(record) => {
                setRejectPHLRecord(record)
                setRejectPHLReason('')
              }}
              onDelete={requestDeletePHL}
              onDetail={setSelectedPHLRecord}
            />
          )}

          {!loading && activeTab === 'phl-balance' && (
            <PHLBalanceTab
              summaries={filteredBalanceSummary}
              balances={filteredPHLBalances}
              onDelete={requestDeletePHL}
              onDetail={setSelectedPHLRecord}
            />
          )}

          {!loading && activeTab === 'history' && (
            <HistoryTab
              leaveRequests={filteredLeaveRequests}
              phlRecords={filteredPHLClaims}
              onLeaveDetail={setSelectedLeaveRequest}
              onPHLDetail={setSelectedPHLRecord}
              onDeleteLeave={requestDeleteLeave}
              onDeletePHL={requestDeletePHL}
            />
          )}
        </div>

        {selectedLeaveRequest && (
          <LeaveDetailModal
            record={selectedLeaveRequest}
            onClose={() => setSelectedLeaveRequest(null)}
          />
        )}

        {selectedPHLRecord && (
          <PHLDetailModal
            record={selectedPHLRecord}
            onClose={() => setSelectedPHLRecord(null)}
          />
        )}

        {rejectPHLRecord && (
          <RejectPHLModal
            record={rejectPHLRecord}
            reason={rejectPHLReason}
            processing={processingId === rejectPHLRecord.id}
            onReasonChange={setRejectPHLReason}
            onClose={() => {
              setRejectPHLRecord(null)
              setRejectPHLReason('')
            }}
            onSubmit={rejectPHLClaim}
          />
        )}

        {rejectLeaveRecord && (
          <RejectLeaveModal
            record={rejectLeaveRecord}
            reason={rejectLeaveReason}
            processing={processingId === rejectLeaveRecord.id}
            onReasonChange={setRejectLeaveReason}
            onClose={() => {
              setRejectLeaveRecord(null)
              setRejectLeaveReason('')
            }}
            onSubmit={rejectLeaveRequest}
          />
        )}

        {deleteTarget && (
          <DeleteConfirmModal
            target={deleteTarget}
            processing={processingId === deleteTarget.id}
            onClose={() => setDeleteTarget(null)}
            onConfirm={confirmDeleteTarget}
          />
        )}
      </section>
    </>
  )
}

function LeaveRequestTab({
  requests,
  processingId,
  onApprove,
  onReject,
  onDelete,
  onDetail,
}: {
  requests: LeaveRequest[]
  processingId: string
  onApprove: (item: LeaveRequest) => void
  onReject: (item: LeaveRequest) => void
  onDelete: (item: LeaveRequest) => void
  onDetail: (item: LeaveRequest) => void
}) {
  return (
    <div>
      <SectionIntro
        title="Pengajuan Cuti & Izin"
        description="Review pengajuan cuti, izin, sakit, tugas luar, dan job pending karyawan."
      />

      <DataTable
        emptyTitle="Belum ada pengajuan cuti/izin"
        emptyDescription="Pengajuan karyawan akan muncul di sini."
        minWidth="1450px"
        headers={[
          'Karyawan',
          'Jenis',
          'Tanggal',
          'Hari',
          'Job Pending',
          'Atasan',
          'HR',
          'Detail',
          'Action',
        ]}
      >
        {requests.map((item) => {
          const hrStatus = normalizeStatus(item.hr_status || item.status)
          const canProcess =
            hrStatus === 'pending' ||
            hrStatus === 'submitted' ||
            hrStatus === 'waiting_supervisor' ||
            hrStatus === 'waiting_hr'

          return (
            <tr key={item.id} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
              <td className="px-5 py-4">
                <EmployeeCell
                  name={item.full_name || '-'}
                  meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
                />
              </td>

              <td className="px-5 py-4">
                <p className="font-semibold text-[#1d1d1f]">
                  {item.leave_type || item.request_type || '-'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[#6e6e73]">
                  {item.reason || '-'}
                </p>
              </td>

              <td className="px-5 py-4 text-sm text-[#1d1d1f]">
                {formatDisplayDate(item.start_date || '')} - {formatDisplayDate(item.end_date || '')}
              </td>

              <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
                {item.total_days || 0} hari
              </td>

              <td className="px-5 py-4">
                <JobPendingPreview
                  summary={item.job_pending_summary}
                  handoverName={item.handover_to_full_name}
                />
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={item.supervisor_status || 'pending'} />
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={item.hr_status || item.status || 'pending'} />
              </td>

              <td className="px-5 py-4">
                <button
                  type="button"
                  onClick={() => onDetail(item)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
                >
                  <FileText size={15} />
                  Detail
                </button>
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {canProcess ? (
                    <>
                      <SmallActionButton
                        label="Approve"
                        icon={<CheckCircle2 size={14} />}
                        tone="green"
                        disabled={processingId === item.id}
                        onClick={() => onApprove(item)}
                      />
                      <SmallActionButton
                        label="Reject"
                        icon={<XCircle size={14} />}
                        tone="red"
                        disabled={processingId === item.id}
                        onClick={() => onReject(item)}
                      />
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-[#86868b]">
                      Selesai
                    </span>
                  )}

                  <SmallActionButton
                    label="Hapus"
                    icon={<Trash2 size={14} />}
                    tone="red"
                    disabled={processingId === item.id}
                    onClick={() => onDelete(item)}
                  />
                </div>
              </td>
            </tr>
          )
        })}
      </DataTable>
    </div>
  )
}

function PHLClaimApprovalTab({
  claims,
  processingId,
  onApprove,
  onReject,
  onDelete,
  onDetail,
}: {
  claims: PHLRecord[]
  processingId: string
  onApprove: (record: PHLRecord) => void
  onReject: (record: PHLRecord) => void
  onDelete: (record: PHLRecord) => void
  onDetail: (record: PHLRecord) => void
}) {
  const pending = claims.filter((item) => {
    const status = normalizeStatus(item.status)

    return (
      status === 'pending' ||
      status === 'submitted' ||
      status === 'waiting_hr'
    )
  })

  return (
    <div>
      <SectionIntro
        title="Approval Klaim PHL"
        description="Jika disetujui HR, saldo PHL otomatis berkurang. HR juga dapat menjadi backup jika atasan berhalangan."
      />

      <div className="grid gap-5 p-6 md:grid-cols-3">
        <MiniPanel title="Pending Klaim" value={`${pending.length}`} icon={<Clock3 size={20} />} />
        <MiniPanel title="Total Klaim" value={`${claims.length}`} icon={<Plane size={20} />} />
        <MiniPanel title="Metode Saldo" value="FIFO" icon={<ShieldCheck size={20} />} />
      </div>

      <DataTable
        emptyTitle="Belum ada klaim PHL"
        emptyDescription="Pengajuan klaim PHL karyawan akan muncul di sini."
        minWidth="1450px"
        headers={[
          'Karyawan',
          'Tanggal Klaim',
          'Hari',
          'Alasan',
          'Job Pending',
          'Atasan',
          'HR',
          'Detail',
          'Action',
        ]}
      >
        {claims.map((item) => {
          const status = normalizeStatus(item.status)

          const canProcess =
            status === 'pending' ||
            status === 'submitted' ||
            status === 'waiting_hr'

          return (
            <tr key={item.id} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
              <td className="px-5 py-4">
                <EmployeeCell
                  name={item.full_name || '-'}
                  meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
                />
              </td>

              <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
                {formatDisplayDate(item.phl_date || '')}
              </td>

              <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
                {item.used_days || 0} hari
              </td>

              <td className="px-5 py-4">
                <p className="line-clamp-2 max-w-[240px] text-sm leading-6 text-[#6e6e73]">
                  {item.reason || item.notes || '-'}
                </p>
              </td>

              <td className="px-5 py-4">
                <JobPendingPreview
                  summary={item.job_pending_summary}
                  handoverName={item.handover_to_full_name}
                />
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={item.supervisor_status || 'pending'} />
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={item.hr_status || item.status || 'pending'} />
              </td>

              <td className="px-5 py-4">
                <button
                  type="button"
                  onClick={() => onDetail(item)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
                >
                  <FileText size={15} />
                  Detail
                </button>
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {canProcess ? (
                    <>
                      <SmallActionButton
                        label="Approve"
                        icon={<CheckCircle2 size={14} />}
                        tone="green"
                        disabled={processingId === item.id}
                        onClick={() => onApprove(item)}
                      />
                      <SmallActionButton
                        label="Reject"
                        icon={<XCircle size={14} />}
                        tone="red"
                        disabled={processingId === item.id}
                        onClick={() => onReject(item)}
                      />
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-[#86868b]">
                      Selesai
                    </span>
                  )}

                  <SmallActionButton
                    label="Hapus"
                    icon={<Trash2 size={14} />}
                    tone="red"
                    disabled={processingId === item.id}
                    onClick={() => onDelete(item)}
                  />
                </div>
              </td>
            </tr>
          )
        })}
      </DataTable>
    </div>
  )
}

function PHLBalanceTab({
  summaries,
  balances,
  onDelete,
  onDetail,
}: {
  summaries: PHLBalanceSummary[]
  balances: PHLRecord[]
  onDelete: (record: PHLRecord) => void
  onDetail: (record: PHLRecord) => void
}) {
  return (
    <div>
      <SectionIntro
        title="Saldo PHL"
        description="Ringkasan saldo PHL per karyawan dan detail saldo yang berasal dari PHL approved."
      />

      <div className="grid gap-4 p-6 xl:grid-cols-3">
        {summaries.map((item, index) => (
          <div
            key={item.employee_id || `${item.full_name}-${index}`}
            className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm"
          >
            <EmployeeCell
              name={item.full_name || '-'}
              meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
            />

            <div className="mt-5 grid grid-cols-3 gap-3">
              <BalanceBox label="Earned" value={item.total_earned_days || 0} tone="green" />
              <BalanceBox label="Used" value={item.total_used_days || 0} tone="orange" />
              <BalanceBox label="Available" value={item.total_available_days || 0} tone="purple" />
            </div>

            {Number(item.pending_claim_count || 0) > 0 && (
              <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-700">
                Ada {item.pending_claim_count} klaim PHL pending.
              </div>
            )}
          </div>
        ))}
      </div>

      <DataTable
        emptyTitle="Belum ada saldo PHL"
        emptyDescription="Saldo PHL akan muncul setelah PHL dari absensi disetujui."
        minWidth="1300px"
        headers={[
          'Karyawan',
          'Tanggal PHL',
          'Masa Berlaku',
          'Saldo',
          'Terpakai',
          'Sisa',
          'Status',
          'Detail',
          'Action',
        ]}
      >
        {balances.map((item) => (
          <tr key={item.id} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
            <td className="px-5 py-4">
              <EmployeeCell
                name={item.full_name || '-'}
                meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
              />
            </td>

            <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
              {formatDisplayDate(item.phl_date || '')}
            </td>

            <td className="px-5 py-4 text-sm text-[#1d1d1f]">
              {formatDisplayDate(item.valid_from || item.phl_date || '')} - {formatDisplayDate(item.expired_at || '')}
            </td>

            <NumberCell value={item.balance_days || 0} tone="green" />
            <NumberCell value={item.used_days || 0} tone="orange" />
            <NumberCell value={item.remaining_days || 0} tone="purple" />

            <td className="px-5 py-4">
              <StatusBadge status={item.status || 'approved'} />
            </td>

            <td className="px-5 py-4">
              <button
                type="button"
                onClick={() => onDetail(item)}
                className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#f7edfc] px-4 text-xs font-bold text-[#7b2cbf]"
              >
                <FileText size={15} />
                Detail
              </button>
            </td>

            <td className="px-5 py-4">
              <SmallActionButton
                label="Hapus"
                icon={<Trash2 size={14} />}
                tone="red"
                disabled={false}
                onClick={() => onDelete(item)}
              />
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  )
}

function HistoryTab({
  leaveRequests,
  phlRecords,
  onLeaveDetail,
  onPHLDetail,
  onDeleteLeave,
  onDeletePHL,
}: {
  leaveRequests: LeaveRequest[]
  phlRecords: PHLRecord[]
  onLeaveDetail: (record: LeaveRequest) => void
  onPHLDetail: (record: PHLRecord) => void
  onDeleteLeave: (record: LeaveRequest) => void
  onDeletePHL: (record: PHLRecord) => void
}) {
  return (
    <div>
      <SectionIntro
        title="Riwayat"
        description="Riwayat pengajuan cuti/izin dan klaim PHL."
      />

      <DataTable
        emptyTitle="Belum ada riwayat"
        emptyDescription="Riwayat akan muncul setelah ada pengajuan."
        minWidth="1250px"
        headers={[
          'Karyawan',
          'Jenis',
          'Tanggal',
          'Hari',
          'Status',
          'Detail',
          'Action',
        ]}
      >
        {leaveRequests.map((item) => (
          <tr key={`leave-${item.id}`} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
            <td className="px-5 py-4">
              <EmployeeCell
                name={item.full_name || '-'}
                meta={`${item.employee_number || '-'} · ${item.department || '-'}`}
              />
            </td>

            <td className="px-5 py-4 font-semibold text-[#1d1d1f]">
              {item.leave_type || item.request_type || 'Cuti/Izin'}
            </td>

            <td className="px-5 py-4 text-sm text-[#1d1d1f]">
              {formatDisplayDate(item.start_date || '')} - {formatDisplayDate(item.end_date || '')}
            </td>

            <td className="px-5 py-4 text-sm font-semibold">
              {item.total_days || 0} hari
            </td>

            <td className="px-5 py-4">
              <StatusBadge status={item.hr_status || item.status || item.supervisor_status || 'pending'} />
            </td>

            <td className="px-5 py-4">
              <button
                type="button"
                onClick={() => onLeaveDetail(item)}
                className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
              >
                <FileText size={15} />
                Detail
              </button>
            </td>

            <td className="px-5 py-4">
              <SmallActionButton
                label="Hapus"
                icon={<Trash2 size={14} />}
                tone="red"
                disabled={false}
                onClick={() => onDeleteLeave(item)}
              />
            </td>
          </tr>
        ))}

        {phlRecords.map((item) => (
          <tr key={`phl-${item.id}`} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
            <td className="px-5 py-4">
              <EmployeeCell
                name={item.full_name || '-'}
                meta={`${item.employee_number || '-'} · ${item.department || '-'}`}
              />
            </td>

            <td className="px-5 py-4 font-semibold text-[#1d1d1f]">
              Klaim PHL
            </td>

            <td className="px-5 py-4 text-sm text-[#1d1d1f]">
              {formatDisplayDate(item.phl_date || '')}
            </td>

            <td className="px-5 py-4 text-sm font-semibold">
              {item.used_days || 0} hari
            </td>

            <td className="px-5 py-4">
              <StatusBadge status={item.status || 'pending'} />
            </td>

            <td className="px-5 py-4">
              <button
                type="button"
                onClick={() => onPHLDetail(item)}
                className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
              >
                <FileText size={15} />
                Detail
              </button>
            </td>

            <td className="px-5 py-4">
              <SmallActionButton
                label="Hapus"
                icon={<Trash2 size={14} />}
                tone="red"
                disabled={false}
                onClick={() => onDeletePHL(item)}
              />
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  )
}

function LeaveDetailModal({
  record,
  onClose,
}: {
  record: LeaveRequest
  onClose: () => void
}) {
  return (
    <ModalShell
      title="Detail Pengajuan Cuti/Izin"
      description={record.full_name || '-'}
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoBox label="Nama" value={record.full_name || '-'} />
        <InfoBox label="NIP" value={record.employee_number || '-'} />
        <InfoBox label="Unit" value={record.department || '-'} />
        <InfoBox label="Jabatan" value={record.position || '-'} />
        <InfoBox label="Jenis" value={record.leave_type || record.request_type || '-'} />
        <InfoBox label="Tanggal" value={`${formatDisplayDate(record.start_date || '')} - ${formatDisplayDate(record.end_date || '')}`} />
        <InfoBox label="Total Hari" value={`${record.total_days || 0} hari`} />
        <InfoBox label="Status Atasan" value={formatStatus(normalizeStatus(record.supervisor_status))} />
        <InfoBox label="Status HR" value={formatStatus(normalizeStatus(record.hr_status || record.status))} />
        <InfoBox label="Diajukan Oleh" value={record.submitted_by || '-'} />
      </div>

      <ContentBox
        title="Alasan Pengajuan"
        content={record.reason || '-'}
      />

      <HandoverDetailBox
        summary={record.job_pending_summary}
        detail={record.job_pending_detail}
        handoverName={record.handover_to_full_name}
        handoverMeta={`${record.handover_to_employee_number || '-'} · ${record.handover_to_department || '-'} · ${record.handover_to_position || '-'}`}
        handoverNote={record.handover_note}
        emergencyContact={record.emergency_contact_during_leave}
      />

      {(record.proof_url || record.proof_file_url) && (
        <a
          href={record.proof_url || record.proof_file_url || '#'}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 text-sm font-bold text-white"
        >
          <FileText size={17} />
          Buka Dokumen Bukti
        </a>
      )}
    </ModalShell>
  )
}

function PHLDetailModal({
  record,
  onClose,
}: {
  record: PHLRecord
  onClose: () => void
}) {
  return (
    <ModalShell
      title={record.source === 'employee_phl_claim' ? 'Detail Klaim PHL' : 'Detail Saldo PHL'}
      description={record.full_name || '-'}
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoBox label="Nama" value={record.full_name || '-'} />
        <InfoBox label="NIP" value={record.employee_number || '-'} />
        <InfoBox label="Unit" value={record.department || '-'} />
        <InfoBox label="Jabatan" value={record.position || '-'} />
        <InfoBox label="Tanggal" value={formatDisplayDate(record.phl_date || record.valid_from || '')} />
        <InfoBox label="Expired" value={formatDisplayDate(record.expired_at || '')} />
        <InfoBox label="Saldo" value={`${record.balance_days || 0} hari`} />
        <InfoBox label="Terpakai" value={`${record.used_days || 0} hari`} />
        <InfoBox label="Sisa" value={`${record.remaining_days || 0} hari`} />
        <InfoBox label="Status Atasan" value={formatStatus(normalizeStatus(record.supervisor_status))} />
        <InfoBox label="Status HR" value={formatStatus(normalizeStatus(record.hr_status || record.status))} />
      </div>

      <ContentBox
        title={record.source === 'employee_phl_claim' ? 'Alasan Klaim PHL' : 'Alasan / Catatan'}
        content={record.reason || record.notes || '-'}
      />

      {record.source === 'employee_phl_claim' && (
        <HandoverDetailBox
          summary={record.job_pending_summary}
          detail={record.job_pending_detail}
          handoverName={record.handover_to_full_name}
          handoverMeta={`${record.handover_to_employee_number || '-'} · ${record.handover_to_department || '-'} · ${record.handover_to_position || '-'}`}
          handoverNote={record.handover_note}
          emergencyContact={record.emergency_contact_during_leave}
        />
      )}

      {record.proof_file_url && (
        <a
          href={record.proof_file_url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 text-sm font-bold text-white"
        >
          <FileText size={17} />
          Buka Dokumen
        </a>
      )}
    </ModalShell>
  )
}

function DeleteConfirmModal({
  target,
  processing,
  onClose,
  onConfirm,
}: {
  target: DeleteTarget
  processing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="relative overflow-hidden bg-[#1d1d1f] p-6 text-white">
          <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-red-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#007aff]/20 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-200 ring-1 ring-red-300/20">
              <Trash2 size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-white/45">
                Konfirmasi Penghapusan
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {target.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/62">
                {target.employeeName}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-[24px] border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {target.description}
          </div>

          <div className="rounded-[24px] border border-black/5 bg-[#f5f5f7]/80 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#86868b]">
              Catatan
            </p>

            <p className="mt-2 text-sm leading-6 text-[#1d1d1f]">
              Aksi ini tidak menggunakan pop-up browser, sehingga tampilan tetap profesional saat aplikasi sudah di-deploy.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-black/5 bg-white px-5 text-sm font-bold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={processing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Trash2 size={17} />
              )}
              {processing ? 'Menghapus...' : 'Ya, Hapus Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RejectPHLModal({
  record,
  reason,
  processing,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  record: PHLRecord
  reason: string
  processing: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalShell
      title="Reject Klaim PHL"
      description={`Tolak klaim PHL ${record.full_name || '-'}`}
      onClose={onClose}
    >
      <label className="block">
        <span className="harmony-label">Alasan Reject</span>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          className="harmony-textarea"
          placeholder="Tuliskan alasan penolakan klaim PHL..."
        />
      </label>

      <RejectModalFooter
        processing={processing}
        onClose={onClose}
        onSubmit={onSubmit}
        submitLabel="Reject Klaim"
      />
    </ModalShell>
  )
}

function RejectLeaveModal({
  record,
  reason,
  processing,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  record: LeaveRequest
  reason: string
  processing: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalShell
      title="Reject Cuti/Izin"
      description={`Tolak pengajuan ${record.full_name || '-'}`}
      onClose={onClose}
    >
      <label className="block">
        <span className="harmony-label">Alasan Reject</span>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          className="harmony-textarea"
          placeholder="Tuliskan alasan penolakan cuti/izin..."
        />
      </label>

      <RejectModalFooter
        processing={processing}
        onClose={onClose}
        onSubmit={onSubmit}
        submitLabel="Reject Pengajuan"
      />
    </ModalShell>
  )
}

function RejectModalFooter({
  processing,
  onClose,
  onSubmit,
  submitLabel,
}: {
  processing: boolean
  onClose: () => void
  onSubmit: () => void
  submitLabel: string
}) {
  return (
    <div className="mt-6 flex justify-end gap-3 border-t border-black/5 pt-5">
      <button
        type="button"
        onClick={onClose}
        className="harmony-button-secondary"
      >
        Batal
      </button>

      <button
        type="button"
        disabled={processing}
        onClick={onSubmit}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <XCircle size={17} />
        {processing ? 'Memproses...' : submitLabel}
      </button>
    </div>
  )
}

function HandoverDetailBox({
  summary,
  detail,
  handoverName,
  handoverMeta,
  handoverNote,
  emergencyContact,
}: {
  summary: string | null | undefined
  detail: string | null | undefined
  handoverName: string | null | undefined
  handoverMeta: string
  handoverNote: string | null | undefined
  emergencyContact: string | null | undefined
}) {
  return (
    <div className="mt-5 rounded-[28px] border border-black/5 bg-[#f5f5f7]/80 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
          <BriefcaseBusiness size={18} />
        </div>

        <div>
          <h3 className="text-base font-semibold text-[#1d1d1f]">
            Job Pending / Serah Terima Pekerjaan
          </h3>
          <p className="text-xs leading-5 text-[#6e6e73]">
            Informasi pekerjaan yang perlu diteruskan selama karyawan tidak hadir.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <InfoBox
          label="Ringkasan Job Pending"
          value={summary || '-'}
        />

        <div className="rounded-[20px] border border-black/5 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
            Detail Job Pending
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#1d1d1f]">
            {detail || '-'}
          </p>
        </div>

        <div className="rounded-[20px] border border-black/5 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
            Ditujukan Kepada / Pengganti Sementara
          </p>

          <p className="mt-2 text-sm font-semibold text-[#1d1d1f]">
            {handoverName || '-'}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
            {handoverMeta}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoBox
            label="Catatan Handover"
            value={handoverNote || '-'}
          />

          <InfoBox
            label="Kontak Darurat"
            value={emergencyContact || '-'}
          />
        </div>
      </div>
    </div>
  )
}

function JobPendingPreview({
  summary,
  handoverName,
}: {
  summary: string | null | undefined
  handoverName: string | null | undefined
}) {
  if (!summary && !handoverName) {
    return (
      <span className="text-xs font-semibold text-[#86868b]">
        -
      </span>
    )
  }

  return (
    <div className="max-w-[240px] rounded-2xl bg-[#f5f5f7] px-3 py-2">
      <p className="line-clamp-2 text-xs font-semibold leading-5 text-[#1d1d1f]">
        {summary || '-'}
      </p>

      <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-[#6e6e73]">
        Ke: {handoverName || '-'}
      </p>
    </div>
  )
}

function ContentBox({
  title,
  content,
}: {
  title: string
  content: string
}) {
  return (
    <div className="mt-5 rounded-[24px] border border-black/5 bg-[#f5f5f7]/70 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {title}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#1d1d1f]">
        {content}
      </p>
    </div>
  )
}

function SectionIntro({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="border-b border-black/5 p-6">
      <h3 className="text-lg font-semibold text-[#1d1d1f]">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
        {description}
      </p>
    </div>
  )
}

function DataTable({
  headers,
  children,
  emptyTitle,
  emptyDescription,
  minWidth,
}: {
  headers: string[]
  children: ReactNode
  emptyTitle: string
  emptyDescription: string
  minWidth: string
}) {
  const hasRows = Array.isArray(children)
    ? children.length > 0
    : Boolean(children)

  if (!hasRows) {
    return (
      <div className="p-6">
        <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
            <FileText size={24} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
            {emptyTitle}
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
            {emptyDescription}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-sm"
        style={{ minWidth }}
      >
        <thead>
          <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
            {headers.map((header) => (
              <th key={header} className="px-5 py-4 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  )
}

function ModalShell({
  title,
  description,
  children,
  onClose,
}: {
  title: string
  description: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              {title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition',
        active
          ? 'bg-[#1d1d1f] text-white shadow-sm'
          : 'bg-[#f5f5f7] text-[#6e6e73] hover:bg-white hover:text-[#1d1d1f]',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
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

function MiniPanel({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#6e6e73]">
            {title}
          </p>

          <h4 className="mt-2 text-xl font-semibold text-[#1d1d1f]">
            {value}
          </h4>
        </div>

        <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
          {icon}
        </div>
      </div>
    </div>
  )
}

function EmployeeCell({
  name,
  meta,
}: {
  name: string
  meta: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#007aff]">
        <UserRound size={18} />
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-[#1d1d1f]">
          {name}
        </p>

        <p className="mt-1 line-clamp-1 text-xs text-[#6e6e73]">
          {meta}
        </p>
      </div>
    </div>
  )
}

function SmallActionButton({
  label,
  icon,
  tone,
  disabled,
  onClick,
}: {
  label: string
  icon: ReactNode
  tone: 'green' | 'red' | 'blue'
  disabled: boolean
  onClick: () => void
}) {
  const className = {
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
    red: 'bg-red-50 text-red-700 hover:bg-red-100',
    blue: 'bg-[#e8f2ff] text-[#0059b8] hover:bg-blue-100',
  }[tone]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-55',
        className,
      ].join(' ')}
    >
      {icon}
      {disabled ? '...' : label}
    </button>
  )
}

function BalanceBox({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'green' | 'orange' | 'purple'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className={`rounded-2xl p-3 text-center ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">
        {value}
      </p>
    </div>
  )
}

function NumberCell({
  value,
  tone,
}: {
  value: number
  tone: 'green' | 'orange' | 'purple'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <td className="px-5 py-4">
      <span className={`inline-flex min-w-8 justify-center rounded-xl px-3 py-1 text-xs font-bold ${className}`}>
        {value}
      </span>
    </td>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[20px] border border-black/5 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-[#1d1d1f]">
        {value}
      </p>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const normalized = normalizeStatus(status)

  const className =
    normalized === 'approved' || normalized === 'finalized'
      ? 'bg-green-50 text-green-700'
      : normalized === 'rejected' || normalized === 'rejected_by_supervisor'
        ? 'bg-red-50 text-red-700'
        : normalized === 'pending' ||
            normalized === 'submitted' ||
            normalized === 'waiting_supervisor' ||
            normalized === 'waiting_hr'
          ? 'bg-orange-50 text-orange-700'
          : 'bg-[#f5f5f7] text-[#6e6e73]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {formatStatus(normalized)}
    </span>
  )
}

function normalizeStatus(value: string | null | undefined) {
  const status = String(value || '').trim().toLowerCase()

  if (!status) return 'pending'

  return status
}

function formatStatus(value: string) {
  if (value === 'pending') return 'Menunggu'
  if (value === 'submitted') return 'Diajukan'
  if (value === 'waiting_supervisor') return 'Menunggu Atasan'
  if (value === 'waiting_hr') return 'Menunggu HR'
  if (value === 'approved') return 'Disetujui'
  if (value === 'rejected') return 'Ditolak'
  if (value === 'rejected_by_supervisor') return 'Ditolak Atasan'
  if (value === 'finalized') return 'Final'
  if (value === 'draft') return 'Draft'

  return value
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