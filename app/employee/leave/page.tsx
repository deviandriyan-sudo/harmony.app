'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Plane,
  Plus,
  RefreshCcw,
  RotateCcw,
  Send,
  Upload,
  UserCheck,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { sendHarmonyEmail } from '@/lib/notifications'
import {
  getActiveHarmonyTypesForScope,
  getHarmonyRequestTypeMeta,
  groupHarmonyTypes,
  refreshHarmonyRequestTypes,
  type HarmonyRequestTypeDefinition,
} from '@/lib/harmony-request-types'

type AppUser = {
  id: string
  email: string
  role: string
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
  supervisor_1?: string | null
  supervisor_2?: string | null
  annual_leave_balance?: number | null
  phl_balance?: number | null
  is_active: boolean | null
  join_date?: string | null
}

type AnnualLeaveSummary = {
  employee_id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position_name: string | null
  email: string | null
  join_date: string | null

  annual_regular_days: number | null
  postpone_active_days: number | null
  postpone_expired_days: number | null
  annual_manual_adjustment_days: number | null
  annual_total_available_days: number | null

  latest_matured_at: string | null
  current_cycle_end: string | null
  next_postpone_expiry: string | null

  postpone_pending_count: number | null
  postpone_active_count: number | null
  postpone_expired_count: number | null

  phl_active_ledger_days: number | null
  phl_expired_days: number | null
  next_phl_expiry: string | null
  phl_total_available_days: number | null
  phl_legacy_or_adjustment_days: number | null
}

type PHLRecord = {
  id: string
  employee_id: string
  phl_date: string | null
  valid_from: string | null
  expired_at: string | null
  status: string | null
  balance_days: number | null
  used_days: number | null
  remaining_days: number | null
  reason: string | null
  source: string | null
}

type MyPHLBalanceSummary = {
  success: boolean
  employee_id: string
  total_available_days: number
  active_ledger_balance: number
  legacy_balance: number
  expiring_30_days: number
  next_expiry: string | null
  expiry_rule_days: number
}

type LeaveRequest = {
  id: string
  employee_id: string | null
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
  supervisor_id: string | null
  supervisor_name: string | null
  supervisor_approved_at: string | null
  supervisor_rejected_at: string | null
  hr_status: string | null
  hr_approved_by: string | null
  hr_approved_at: string | null
  created_at: string | null
}

type Holiday = {
  id: string
  holiday_date: string
  holiday_name: string
  holiday_type: string | null
  is_active: boolean | null
}

type RequestType = string

type FormState = {
  request_type: RequestType
  start_date: string
  end_date: string
  reason: string
  job_pending: string
  handover_to: string
  handover_note: string
  proof_file: File | null
}

const initialForm: FormState = {
  request_type: 'annual_leave',
  start_date: '',
  end_date: '',
  reason: '',
  job_pending: '',
  handover_to: '',
  handover_note: '',
  proof_file: null,
}

type LeaveNotificationResult = {
  success: boolean
  count: number
  message: string
}

function uniqueLeaveEmailList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim().toLowerCase())
        .filter((value) => value.includes('@'))
    )
  )
}

function getLeaveHarmonyBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return process.env.NEXT_PUBLIC_SITE_URL || ''
}

async function getHrLeaveNotificationEmails() {
  const { data, error } = await supabase
    .from('app_users')
    .select('email, role, is_active')
    .eq('is_active', true)
    .ilike('role', '%hr%')

  if (error) {
    console.warn('HR leave email lookup warning:', error)
    return []
  }

  return uniqueLeaveEmailList((data || []).map((item: any) => item.email))
}

async function notifyLeaveRequestSubmitted({
  requester,
  supervisorOne,
  supervisorTwo,
  requestId,
  requestTypeLabel,
  startDate,
  endDate,
  totalDays,
  reason,
  jobPending,
  handoverTo,
  handoverNote,
}: {
  requester: Employee
  supervisorOne: Employee | null
  supervisorTwo: Employee | null
  requestId?: string | null
  requestTypeLabel: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  jobPending: string
  handoverTo: string
  handoverNote?: string | null
}): Promise<LeaveNotificationResult> {
  const supervisorEmails = uniqueLeaveEmailList([
    supervisorOne?.email,
    supervisorTwo?.email,
  ])

  const hrEmails = await getHrLeaveNotificationEmails()

  const toEmails = supervisorEmails.length > 0 ? supervisorEmails : hrEmails
  const ccEmails = supervisorEmails.length > 0 ? hrEmails : []

  if (toEmails.length === 0 && ccEmails.length === 0) {
    return {
      success: false,
      count: 0,
      message: 'Email atasan atau HR belum ditemukan.',
    }
  }

  try {
    await sendHarmonyEmail({
      to: toEmails.length > 0 ? toEmails : ccEmails,
      cc: toEmails.length > 0 ? ccEmails : [],
      subject: `Pengajuan ${requestTypeLabel} - ${requester.full_name || requester.email || 'Employee'}`,
      title: `Pengajuan ${requestTypeLabel} Baru`,
      message: [
        `Karyawan ${requester.full_name || requester.email || '-'} mengajukan ${requestTypeLabel}.`,
        '',
        `NIP / Employee Number: ${requester.employee_number || requester.machine_pin || '-'}`,
        `Departemen: ${requester.department || '-'}`,
        `Jabatan: ${requester.position || '-'}`,
        `Periode: ${formatDisplayDate(startDate)} s.d. ${formatDisplayDate(endDate)}`,
        `Total hari kerja: ${totalDays} hari`,
        '',
        `Alasan: ${reason || '-'}`,
        '',
        `Job pending: ${jobPending || '-'}`,
        `Dialihkan kepada: ${handoverTo || '-'}`,
        `Catatan serah terima: ${handoverNote || '-'}`,
        requestId ? `ID Pengajuan: ${requestId}` : '',
        '',
        'Silakan buka HARMONY untuk melakukan pengecekan dan approval.',
      ]
        .filter(Boolean)
        .join('\n'),
      actionLabel: 'Buka Approval HARMONY',
      actionUrl: `${getLeaveHarmonyBaseUrl()}/employee/approvals/leave`,
    })

    return {
      success: true,
      count: uniqueLeaveEmailList([...toEmails, ...ccEmails]).length,
      message: 'Email notifikasi berhasil dikirim.',
    }
  } catch (error: any) {
    return {
      success: false,
      count: 0,
      message: error?.message || 'Email notifikasi gagal dikirim.',
    }
  }
}

export default function EmployeeLeavePage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [supervisorOne, setSupervisorOne] = useState<Employee | null>(null)
  const [supervisorTwo, setSupervisorTwo] = useState<Employee | null>(null)
  const [employeeDirectory, setEmployeeDirectory] = useState<Employee[]>([])

  const [annualLeave, setAnnualLeave] = useState<AnnualLeaveSummary | null>(null)
  const [phlRecords, setPhlRecords] = useState<PHLRecord[]>([])
  const [myPHLBalance, setMyPHLBalance] = useState<MyPHLBalanceSummary | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [requestTypes, setRequestTypes] = useState<HarmonyRequestTypeDefinition[]>([])

  const [form, setForm] = useState<FormState>(initialForm)
  const [formOpen, setFormOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const annualRegularRemaining = Number(
    annualLeave?.annual_regular_days || 0
  )

  const postponeActiveRemaining = Number(
    annualLeave?.postpone_active_days || 0
  )

  const postponeExpiredDays = Number(
    annualLeave?.postpone_expired_days || 0
  )

  const annualManualAdjustment = Number(
    annualLeave?.annual_manual_adjustment_days || 0
  )

  const annualRemaining = Number(
    annualLeave?.annual_total_available_days || 0
  )

  const annualBalanceUsesHROverride =
    Math.abs(annualManualAdjustment) > 0.0001

  const phlRemainingFromRecords = useMemo(() => {
    return phlRecords.reduce((sum, item) => {
      return sum + Number(item.remaining_days || 0)
    }, 0)
  }, [phlRecords])

  const phlRemaining = Number(
    myPHLBalance?.total_available_days ?? phlRemainingFromRecords
  )

  const phlBalanceUsesHROverride =
    Number(myPHLBalance?.legacy_balance || 0) > 0

  const pendingCount = useMemo(() => {
    return leaveRequests.filter((item) => {
      return (
        isPendingStatus(item.status) ||
        isPendingStatus(item.supervisor_status) ||
        isPendingStatus(item.hr_status)
      )
    }).length
  }, [leaveRequests])

  const calculatedDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0

    return countWorkingDays(
      form.start_date,
      form.end_date,
      holidays
    )
  }, [
    form.start_date,
    form.end_date,
    holidays,
  ])

  const selectedRequestMeta =
    getRequestMeta(form.request_type)

  const requiresProof =
    Boolean(selectedRequestMeta.requires_proof)

  const handoverEmployeeOptions = useMemo(() => {
    return employeeDirectory
      .filter((item) => item.is_active !== false)
      .filter((item) => item.id !== employee?.id)
      .sort((a, b) =>
        String(a.full_name || '').localeCompare(
          String(b.full_name || '')
        )
      )
  }, [
    employeeDirectory,
    employee?.id,
  ])

  const selectedHandoverEmployee = useMemo(() => {
    return (
      employeeDirectory.find((item) => {
        return (
          normalizeText(item.id) === normalizeText(form.handover_to) ||
          normalizeText(item.employee_number) === normalizeText(form.handover_to) ||
          normalizeText(item.machine_pin) === normalizeText(form.handover_to) ||
          normalizeText(item.email) === normalizeText(form.handover_to) ||
          normalizeText(item.full_name) === normalizeText(form.handover_to)
        )
      }) || null
    )
  }, [
    employeeDirectory,
    form.handover_to,
  ])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setSuccessMessage('')
    setErrorMessage('')

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage(
        'Session user belum ditemukan. Silakan login ulang.'
      )
      setLoading(false)
      return
    }

    const {
      data: appUserData,
      error: appUserError,
    } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle<AppUser>()

    if (appUserError) {
      setErrorMessage(appUserError.message)
      setLoading(false)
      return
    }

    if (!appUserData?.employee_id) {
      setErrorMessage(
        'Akun belum terhubung ke data employee. Silakan hubungi HR.'
      )
      setLoading(false)
      return
    }

    setAppUser(appUserData)

    const {
      data: employeeData,
      error: employeeError,
    } = await supabase
      .from('employees')
      .select('*')
      .eq('id', appUserData.employee_id)
      .maybeSingle<Employee>()

    if (employeeError) {
      setErrorMessage(employeeError.message)
      setLoading(false)
      return
    }

    if (!employeeData) {
      setErrorMessage('Data employee tidak ditemukan.')
      setLoading(false)
      return
    }

    setEmployee(employeeData)

    const loadedRequestTypes =
      await refreshHarmonyRequestTypes()

    setRequestTypes(loadedRequestTypes)

    await Promise.all([
      fetchSupervisorData(employeeData),
      fetchAnnualLeaveSummary(employeeData.id),
      fetchPHLBalance(employeeData.id),
      fetchLeaveRequests(employeeData.id),
      fetchHolidays(),
    ])

    setLoading(false)
  }

  async function fetchSupervisorData(
    employeeData: Employee
  ) {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)

    const employeeList =
      (data || []) as Employee[]

    setEmployeeDirectory(employeeList)

    const supervisorOneKey =
      normalizeText(employeeData.supervisor_1)

    const supervisorTwoKey =
      normalizeText(employeeData.supervisor_2)

    const foundOne =
      employeeList.find((item) => {
        return (
          normalizeText(item.id) === supervisorOneKey ||
          normalizeText(item.full_name) === supervisorOneKey ||
          normalizeText(item.employee_number) === supervisorOneKey ||
          normalizeText(item.machine_pin) === supervisorOneKey ||
          normalizeText(item.email) === supervisorOneKey
        )
      }) || null

    const foundTwo =
      employeeList.find((item) => {
        return (
          normalizeText(item.id) === supervisorTwoKey ||
          normalizeText(item.full_name) === supervisorTwoKey ||
          normalizeText(item.employee_number) === supervisorTwoKey ||
          normalizeText(item.machine_pin) === supervisorTwoKey ||
          normalizeText(item.email) === supervisorTwoKey
        )
      }) || null

    setSupervisorOne(foundOne)
    setSupervisorTwo(foundTwo)
  }

  async function fetchAnnualLeaveSummary(
    employeeId: string
  ) {
    const {
      error: reconcileError,
    } = await supabase.rpc(
      'harmony_reconcile_leave_lifecycle',
      {
        p_employee_id: employeeId,
      }
    )

    if (reconcileError) {
      console.warn(
        'Leave lifecycle reconcile warning:',
        reconcileError.message
      )
    }

    const {
      data,
      error,
    } = await supabase
      .from('harmony_leave_balance_summary')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle<AnnualLeaveSummary>()

    if (error) {
      console.warn(
        'Leave lifecycle summary warning:',
        error.message
      )

      setAnnualLeave(null)
      return
    }

    setAnnualLeave(data || null)
  }

  async function fetchPHLBalance(
    employeeId: string
  ) {
    const [
      {
        data: recordData,
      },
      {
        data: summaryData,
        error: summaryError,
      },
    ] = await Promise.all([
      supabase
        .from('phl_records')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .gt('remaining_days', 0)
        .gte('expired_at', getTodayISO())
        .order('expired_at', {
          ascending: true,
        }),

      supabase.rpc(
        'get_my_phl_balance_summary'
      ),
    ])

    setPhlRecords(recordData || [])

    if (summaryError) {
      console.warn(
        'Ringkasan saldo PHL V4 gagal dimuat:',
        summaryError.message
      )

      setMyPHLBalance(null)
      return
    }

    setMyPHLBalance(
      (summaryData || null) as MyPHLBalanceSummary | null
    )
  }

  async function fetchLeaveRequests(
    employeeId: string
  ) {
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', {
        ascending: false,
      })

    setLeaveRequests(data || [])
  }

  async function fetchHolidays() {
    const year =
      new Date().getFullYear()

    const { data } = await supabase
      .from('holidays')
      .select('*')
      .eq('is_active', true)
      .gte(
        'holiday_date',
        `${year - 1}-01-01`
      )
      .lte(
        'holiday_date',
        `${year + 1}-12-31`
      )
      .order('holiday_date', {
        ascending: true,
      })

    setHolidays(data || [])
  }

  function updateForm<
    K extends keyof FormState,
  >(
    key: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
  }

  function openForm() {
    setSuccessMessage('')
    setErrorMessage('')
    setFormOpen(true)
  }

  function closeForm() {
    if (submitting) return

    setFormOpen(false)
  }

  async function uploadProofFile(
    file: File | null
  ) {
    if (!file) {
      return {
        url: '',
        name: '',
        size: 0,
        type: '',
        error: '',
      }
    }

    const cleanName =
      file.name
        .replace(/\s+/g, '-')
        .replace(
          /[^a-zA-Z0-9.-]/g,
          ''
        )

    const path =
      `leave-requests/${Date.now()}-${crypto.randomUUID()}-${cleanName || 'file'}`

    const { error } =
      await supabase.storage
        .from('leave-attachments')
        .upload(path, file)

    if (error) {
      return {
        url: '',
        name: '',
        size: 0,
        type: '',
        error: error.message,
      }
    }

    const { data } =
      supabase.storage
        .from('leave-attachments')
        .getPublicUrl(path)

    return {
      url: data.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      error: '',
    }
  }

  async function checkLockedPeriod() {
    if (
      !employee ||
      !form.start_date ||
      !form.end_date
    ) {
      return false
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      'is_employee_date_range_locked',
      {
        p_employee_id: employee.id,
        p_start_date: form.start_date,
        p_end_date: form.end_date,
      }
    )

    if (error) {
      return false
    }

    return Boolean(data)
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSubmitting(true)
    setSuccessMessage('')
    setErrorMessage('')

    if (!appUser || !employee) {
      setErrorMessage(
        'Data user belum lengkap.'
      )

      setSubmitting(false)
      return
    }

    if (
      !form.start_date ||
      !form.end_date
    ) {
      setErrorMessage(
        'Tanggal mulai dan tanggal selesai wajib diisi.'
      )

      setSubmitting(false)
      return
    }

    if (
      form.end_date <
      form.start_date
    ) {
      setErrorMessage(
        'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'
      )

      setSubmitting(false)
      return
    }

    if (calculatedDays <= 0) {
      setErrorMessage(
        'Jumlah hari pengajuan harus lebih dari 0 hari kerja.'
      )

      setSubmitting(false)
      return
    }

    if (!form.reason.trim()) {
      setErrorMessage(
        'Alasan pengajuan wajib diisi.'
      )

      setSubmitting(false)
      return
    }

    if (!form.job_pending.trim()) {
      setErrorMessage(
        'Job pending wajib diisi agar pekerjaan tetap terpantau saat karyawan tidak masuk.'
      )

      setSubmitting(false)
      return
    }

    if (!form.handover_to.trim()) {
      setErrorMessage(
        'Kolom penerima job pending wajib diisi.'
      )

      setSubmitting(false)
      return
    }

    if (
      requiresProof &&
      !form.proof_file
    ) {
      setErrorMessage(
        `${selectedRequestMeta.label} wajib melampirkan bukti/dokumen pendukung.`
      )

      setSubmitting(false)
      return
    }

    const isLocked =
      await checkLockedPeriod()

    if (isLocked) {
      setErrorMessage(
        'Tanggal pengajuan masuk periode absensi yang sudah dikunci HR. Hubungi HR jika perlu revisi.'
      )

      setSubmitting(false)
      return
    }

    if (
      form.request_type === 'annual_leave' &&
      calculatedDays > annualRemaining
    ) {
      setErrorMessage(
        `Saldo cuti tahunan tidak cukup. Sisa saldo saat ini ${annualRemaining} hari.`
      )

      setSubmitting(false)
      return
    }

    if (
      form.request_type === 'phl_claim' &&
      calculatedDays > phlRemaining
    ) {
      setErrorMessage(
        `Saldo PHL tidak cukup. Sisa saldo PHL saat ini ${phlRemaining} hari.`
      )

      setSubmitting(false)
      return
    }

    const uploaded =
      await uploadProofFile(
        form.proof_file
      )

    if (uploaded.error) {
      setErrorMessage(
        uploaded.error
      )

      setSubmitting(false)
      return
    }

    const now =
      new Date().toISOString()

    const payload = {
      employee_id: employee.id,
      employee_number: employee.employee_number,
      machine_pin: employee.machine_pin,
      full_name: employee.full_name,
      department: employee.department,
      position: employee.position,
      email: employee.email || appUser.email,

      request_category:
        selectedRequestMeta.category,

      leave_type:
        selectedRequestMeta.label,

      request_type:
        form.request_type,

      start_date:
        form.start_date,

      end_date:
        form.end_date,

      total_days:
        calculatedDays,

      reason:
        form.reason.trim(),

      job_pending:
        form.job_pending.trim(),

      handover_to:
        form.handover_to.trim(),

      handover_note:
        form.handover_note.trim() || null,

      proof_file_url:
        uploaded.url || null,

      proof_file_name:
        uploaded.name || null,

      proof_file_size:
        uploaded.size || null,

      proof_file_type:
        uploaded.type || null,

      status: 'pending',

      supervisor_status:
        'pending',

      supervisor_id:
        supervisorOne?.id || null,

      supervisor_name:
        supervisorOne?.full_name ||
        employee.supervisor_1 ||
        null,

      hr_status:
        'pending',

      source:
        'employee_self_service',

      is_locked:
        false,

      updated_at:
        now,

      created_at:
        now,
    }

    const {
      data: insertedRequest,
      error,
    } = await supabase
      .from('leave_requests')
      .insert(payload)
      .select('*')
      .single<LeaveRequest>()

    if (error) {
      setErrorMessage(
        error.message
      )

      setSubmitting(false)
      return
    }

    const notificationResult =
      await notifyLeaveRequestSubmitted({
        requester: employee,

        supervisorOne,
        supervisorTwo,

        requestId:
          insertedRequest?.id,

        requestTypeLabel:
          selectedRequestMeta.label,

        startDate:
          form.start_date,

        endDate:
          form.end_date,

        totalDays:
          calculatedDays,

        reason:
          form.reason.trim(),

        jobPending:
          form.job_pending.trim(),

        handoverTo:
          selectedHandoverEmployee?.full_name ||
          form.handover_to.trim(),

        handoverNote:
          form.handover_note.trim() ||
          null,
      })

    setSuccessMessage(
      notificationResult.success
        ? `${selectedRequestMeta.label} berhasil diajukan dan email notifikasi terkirim ke ${notificationResult.count} penerima.`
        : `${selectedRequestMeta.label} berhasil diajukan, tetapi email notifikasi belum terkirim: ${notificationResult.message}`
    )

    resetForm()
    setFormOpen(false)
    setSubmitting(false)

    await Promise.all([
      fetchAnnualLeaveSummary(employee.id),
      fetchPHLBalance(employee.id),
      fetchLeaveRequests(employee.id),
      fetchHolidays(),
    ])
  }

  return (
    <>
      <Topbar
        title="Cuti & Izin"
        description="Ajukan cuti, izin, sakit, tugas luar, klaim PHL, jenis ketidakhadiran custom, dan postpone sisa cuti tahunan."
      />

      <section className="space-y-6 p-4 sm:p-6">
        {successMessage && (
          <AlertBox
            tone="green"
            title="Berhasil"
            icon={
              <CheckCircle2
                size={18}
              />
            }
          >
            {successMessage}
          </AlertBox>
        )}

        {errorMessage && (
          <AlertBox
            tone="orange"
            title="Perhatian"
            icon={
              <AlertTriangle
                size={18}
              />
            }
          >
            {errorMessage}
          </AlertBox>
        )}

        <div className="relative overflow-hidden rounded-[34px] border border-black/5 bg-[#1d1d1f] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative flex flex-col gap-7">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <CalendarDays
                  size={15}
                  className="text-[#5ac8fa]"
                />

                Employee Leave Request
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Cuti, Izin & PHL
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/62">
                Ajukan cuti, izin,
                sakit, tugas luar,
                klaim PHL, dan pantau
                status approval dalam
                satu dashboard.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroMetric
                label="Total Cuti Tersedia"
                value={`${annualRemaining} hari`}
              />

              <HeroMetric
                label="Postpone Aktif"
                value={`${postponeActiveRemaining} hari`}
              />

              <HeroMetric
                label="Saldo PHL"
                value={`${phlRemaining} hari`}
              />

              <HeroMetric
                label="Pending"
                value={String(
                  pendingCount
                )}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Cuti Tahunan Matang"
            value={`${annualRegularRemaining} hari`}
            description={
              annualLeave?.latest_matured_at
                ? `Matang terakhir: ${formatDisplayDate(
                    annualLeave.latest_matured_at
                  )}`
                : 'Belum mencapai anniversary hak cuti'
            }
            icon={
              <WalletCards
                size={22}
              />
            }
            tone="blue"
          />

          <SummaryCard
            title="Postpone Aktif"
            value={`${postponeActiveRemaining} hari`}
            description={
              postponeActiveRemaining > 0
                ? `Berlaku sampai: ${formatDisplayDate(
                    annualLeave?.next_postpone_expiry || ''
                  )}`
                : postponeExpiredDays > 0
                  ? `${postponeExpiredDays} hari postpone sudah expired dan tidak dihitung`
                  : 'Belum ada saldo postpone aktif'
            }
            icon={
              <RotateCcw
                size={22}
              />
            }
            tone="purple"
          />

          <SummaryCard
            title="Sisa PHL"
            value={`${phlRemaining} hari`}
            description={
              phlBalanceUsesHROverride
                ? 'Mengikuti saldo dari HR Master Employee'
                : 'Saldo PHL aktif dan belum expired'
            }
            icon={
              <Plane
                size={22}
              />
            }
            tone="purple"
          />

          <SummaryCard
            title="Menunggu Approval"
            value={`${pendingCount}`}
            description="Pengajuan yang belum final"
            icon={
              <Clock3
                size={22}
              />
            }
            tone="orange"
          />

          <SummaryCard
            title="Atasan Approval"
            value={
              supervisorOne?.full_name ||
              employee?.supervisor_1 ||
              '-'
            }
            description={
              supervisorTwo?.full_name
                ? `Atasan 2: ${supervisorTwo.full_name}`
                : 'Atasan dari data karyawan'
            }
            icon={
              <UserCheck
                size={22}
              />
            }
            tone="green"
          />
        </div>

        <div className="rounded-[26px] border border-blue-100 bg-[#f7fbff] p-5 text-sm leading-6 text-[#41607d]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-[#1d1d1f]">
                Total Cuti Tersedia:{' '}
                {annualRemaining} hari
              </p>

              <p className="mt-1">
                {annualRegularRemaining}{' '}
                hari cuti tahunan matang
                {' + '}
                {postponeActiveRemaining}{' '}
                hari postpone aktif

                {annualBalanceUsesHROverride
                  ? ` ${annualManualAdjustment >= 0 ? '+' : '-'} ${Math.abs(
                      annualManualAdjustment
                    )} hari adjustment HR`
                  : ''}

                . Postpone expired tidak
                lagi mengurangi saldo
                secara manual.
              </p>
            </div>

            {postponeExpiredDays > 0 && (
              <span className="inline-flex shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                {postponeExpiredDays}{' '}
                hari postpone expired
              </span>
            )}
          </div>
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Dashboard Pengajuan
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                Buka form pengajuan
                lewat modal, akses
                postpone cuti, atau
                refresh saldo dan
                riwayat.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
              <button
                type="button"
                onClick={openForm}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-4 text-sm font-bold text-white transition hover:bg-black"
              >
                <Plus size={18} />
                Ajukan
              </button>

              <Link
                href="/employee/leave/postpone"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-sm font-bold text-[#0059b8] transition hover:bg-blue-100"
              >
                <RotateCcw size={18} />
                Postpone Cuti
              </Link>

              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white px-4 text-sm font-bold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCcw
                    size={18}
                  />
                )}

                Refresh
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <EmployeeIdentity
              employee={employee}
              supervisorOne={supervisorOne}
              supervisorTwo={supervisorTwo}
            />
          </div>
        </div>

        <HistorySection
          loading={loading}
          leaveRequests={leaveRequests}
          phlRecords={phlRecords}
        />

        {formOpen && (
          <LeaveRequestModal
            form={form}
            employee={employee}
            supervisorOne={supervisorOne}
            supervisorTwo={supervisorTwo}
            loading={loading}
            submitting={submitting}
            calculatedDays={calculatedDays}
            requiresProof={requiresProof}
            selectedRequestMeta={selectedRequestMeta}
            requestTypes={requestTypes}
            annualRemaining={annualRemaining}
            phlRemaining={phlRemaining}
            handoverEmployeeOptions={handoverEmployeeOptions}
            selectedHandoverEmployee={selectedHandoverEmployee}
            onUpdate={updateForm}
            onSubmit={handleSubmit}
            onClose={closeForm}
          />
        )}
      </section>
    </>
  )
}

function LeaveRequestModal({
  form,
  employee,
  supervisorOne,
  supervisorTwo,
  loading,
  submitting,
  calculatedDays,
  requiresProof,
  selectedRequestMeta,
  requestTypes,
  annualRemaining,
  phlRemaining,
  handoverEmployeeOptions,
  selectedHandoverEmployee,
  onUpdate,
  onSubmit,
  onClose,
}: {
  form: FormState
  employee: Employee | null
  supervisorOne: Employee | null
  supervisorTwo: Employee | null
  loading: boolean
  submitting: boolean
  calculatedDays: number
  requiresProof: boolean
  selectedRequestMeta: ReturnType<typeof getRequestMeta>
  requestTypes: HarmonyRequestTypeDefinition[]
  annualRemaining: number
  phlRemaining: number
  handoverEmployeeOptions: Employee[]
  selectedHandoverEmployee: Employee | null
  onUpdate: <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => void
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              Form Pengajuan Cuti /
              Izin / PHL
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Isi data pengajuan.
              Sabtu, Minggu, dan hari
              libur aktif tidak dihitung
              sebagai jatah cuti.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f] transition hover:bg-[#e5e5ea] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {loading && (
              <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/70 p-4 text-sm text-[#6e6e73]">
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Memuat data saldo,
                atasan, dan riwayat...
              </div>
            )}

            <EmployeeIdentity
              employee={employee}
              supervisorOne={supervisorOne}
              supervisorTwo={supervisorTwo}
            />

            <label className="block">
              <span className="harmony-label">
                Jenis Pengajuan
              </span>

              <select
                value={form.request_type}
                onChange={(event) =>
                  onUpdate(
                    'request_type',
                    event.target.value as RequestType
                  )
                }
                className="harmony-select"
              >
                {groupHarmonyTypes(
                  getActiveHarmonyTypesForScope(
                    requestTypes,
                    'leave'
                  )
                ).map(([group, items]) => (
                  <optgroup
                    key={group}
                    label={group}
                  >
                    {items.map((item) => (
                      <option
                        key={item.code}
                        value={item.code}
                      >
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="harmony-label">
                  Tanggal Mulai
                </span>

                <input
                  type="date"
                  value={form.start_date}
                  onChange={(event) =>
                    onUpdate(
                      'start_date',
                      event.target.value
                    )
                  }
                  className="harmony-input"
                />
              </label>

              <label className="block">
                <span className="harmony-label">
                  Tanggal Selesai
                </span>

                <input
                  type="date"
                  value={form.end_date}
                  onChange={(event) =>
                    onUpdate(
                      'end_date',
                      event.target.value
                    )
                  }
                  className="harmony-input"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InfoTile
                label="Jumlah Hari"
                value={`${calculatedDays} hari`}
                description="Exclude weekend/libur"
                tone="blue"
              />

              <InfoTile
                label="Saldo Cuti"
                value={`${annualRemaining} hari`}
                description="Cuti matang + postpone aktif"
                tone="green"
              />

              <InfoTile
                label="Saldo PHL"
                value={`${phlRemaining} hari`}
                description="Saldo PHL aktif"
                tone="purple"
              />
            </div>

            <label className="block">
              <span className="harmony-label">
                Alasan Pengajuan
              </span>

              <textarea
                value={form.reason}
                onChange={(event) =>
                  onUpdate(
                    'reason',
                    event.target.value
                  )
                }
                placeholder="Tuliskan alasan pengajuan secara singkat dan jelas."
                className="harmony-textarea"
              />
            </label>

            <div className="rounded-[28px] border border-black/5 bg-[#f5f5f7]/75 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#007aff] shadow-sm">
                  <UserRound size={18} />
                </div>

                <div>
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Job Pending &
                    Serah Terima
                  </h3>

                  <p className="text-xs leading-5 text-[#6e6e73]">
                    Wajib diisi agar
                    pekerjaan tetap
                    terpantau selama
                    karyawan tidak
                    masuk.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="harmony-label">
                    Job Pending
                  </span>

                  <textarea
                    value={form.job_pending}
                    onChange={(event) =>
                      onUpdate(
                        'job_pending',
                        event.target.value
                      )
                    }
                    placeholder="Contoh: follow up dokumen, pekerjaan yang harus dicek, atau pekerjaan yang belum selesai."
                    className="harmony-textarea"
                  />
                </label>

                <label className="block">
                  <span className="harmony-label">
                    Penerima Job Pending
                  </span>

                  <select
                    value={form.handover_to}
                    onChange={(event) =>
                      onUpdate(
                        'handover_to',
                        event.target.value
                      )
                    }
                    className="harmony-select"
                  >
                    <option value="">
                      Pilih karyawan
                      penerima tugas
                    </option>

                    {handoverEmployeeOptions.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {formatEmployeeOption(
                            item
                          )}
                        </option>
                      )
                    )}
                  </select>
                </label>

                {selectedHandoverEmployee && (
                  <div className="grid gap-3 rounded-2xl bg-white p-4 text-xs sm:grid-cols-4">
                    <AutoReadInfo
                      label="Nama"
                      value={
                        selectedHandoverEmployee.full_name ||
                        '-'
                      }
                    />

                    <AutoReadInfo
                      label="NIP"
                      value={
                        selectedHandoverEmployee.employee_number ||
                        '-'
                      }
                    />

                    <AutoReadInfo
                      label="Unit"
                      value={
                        selectedHandoverEmployee.department ||
                        '-'
                      }
                    />

                    <AutoReadInfo
                      label="Email"
                      value={
                        selectedHandoverEmployee.email ||
                        '-'
                      }
                    />
                  </div>
                )}

                <label className="block">
                  <span className="harmony-label">
                    Catatan Serah Terima
                  </span>

                  <textarea
                    value={form.handover_note}
                    onChange={(event) =>
                      onUpdate(
                        'handover_note',
                        event.target.value
                      )
                    }
                    placeholder="Opsional: arahan tambahan untuk penerima job pending."
                    className="harmony-textarea"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Lampiran Bukti
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    {requiresProof
                      ? `${selectedRequestMeta.label} wajib melampirkan bukti/dokumen pendukung.`
                      : 'Opsional untuk jenis pengajuan ini.'}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[#007aff]">
                    {form.proof_file?.name ||
                      'Belum ada file dipilih'}
                  </p>
                </div>

                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#007aff] shadow-sm transition hover:bg-[#e8f2ff]">
                  <Upload size={17} />
                  Pilih File

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(event) =>
                      onUpdate(
                        'proof_file',
                        event.target.files?.[0] ||
                          null
                      )
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-black/5 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="text-xs leading-5 text-[#6e6e73]">
              Pengajuan akan dikirim
              ke atasan/HR dan
              tersinkron ke riwayat
              setelah berhasil submit.
            </p>

            <button
              type="submit"
              disabled={
                submitting ||
                loading
              }
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Send size={18} />
              )}

              {submitting
                ? 'Mengirim...'
                : `Ajukan ${selectedRequestMeta.label}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function HistorySection({
  loading,
  leaveRequests,
  phlRecords,
}: {
  loading: boolean
  leaveRequests: LeaveRequest[]
  phlRecords: PHLRecord[]
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.38fr]">
      <div className="harmony-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-black/5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1d1d1f]">
              Riwayat Pengajuan Cuti /
              Izin / PHL
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Pantau status pengajuan,
              approval atasan, HR, dan
              periode cuti/izin/PHL
              yang sudah diajukan.
            </p>
          </div>

          <div className="rounded-full bg-[#f5f5f7] px-4 py-2 text-xs font-bold text-[#6e6e73]">
            {leaveRequests.length}{' '}
            pengajuan
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <LoadingState />
          ) : leaveRequests.length > 0 ? (
            <div className="space-y-3">
              {leaveRequests.map(
                (request) => (
                  <HistoryCard
                    key={request.id}
                    request={request}
                  />
                )
              )}
            </div>
          ) : (
            <EmptyState
              title="Belum ada pengajuan"
              description="Klik tombol Ajukan untuk membuat pengajuan cuti, izin, sakit, tugas luar, atau klaim PHL."
            />
          )}
        </div>
      </div>

      <div className="harmony-card overflow-hidden">
        <div className="border-b border-black/5 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-[#1d1d1f]">
            Saldo PHL Aktif
          </h3>

          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
            PHL berlaku maksimal 90
            hari kalender dari tanggal
            PHL.
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <LoadingState />
          ) : phlRecords.length > 0 ? (
            <div className="space-y-3">
              {phlRecords.map(
                (record) => (
                  <PHLBalanceCard
                    key={record.id}
                    record={record}
                  />
                )
              )}
            </div>
          ) : (
            <EmptyState
              title="Belum ada saldo PHL"
              description="Saldo PHL akan muncul setelah PHL disetujui dan belum expired."
            />
          )}
        </div>
      </div>
    </div>
  )
}

function HistoryCard({
  request,
}: {
  request: LeaveRequest
}) {
  const label =
    request.leave_type ||
    getRequestMeta(
      (
        request.request_type ||
        'annual_leave'
      ) as RequestType
    ).label

  const statusValue =
    request.hr_status ||
    request.supervisor_status ||
    request.status ||
    'pending'

  const tone =
    getStatusTone(statusValue)

  return (
    <article className="rounded-[26px] border border-black/5 bg-white p-4 shadow-sm transition hover:bg-[#fbfbfd] sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={formatStatus(
                statusValue
              )}
              tone={tone}
            />

            <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#1d1d1f]">
              {label}
            </span>
          </div>

          <h3 className="mt-3 text-base font-bold text-[#1d1d1f]">
            {formatDisplayDate(
              request.start_date || ''
            )}{' '}
            -{' '}
            {formatDisplayDate(
              request.end_date || ''
            )}
          </h3>

          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
            {request.reason ||
              'Tidak ada alasan tertulis.'}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SmallInfo
              label="Jumlah Hari"
              value={`${request.total_days || 0} hari`}
            />

            <SmallInfo
              label="Atasan"
              value={
                request.supervisor_name ||
                '-'
              }
            />

            <SmallInfo
              label="Submit"
              value={formatDateTime(
                request.created_at || ''
              )}
            />

            <SmallInfo
              label="HR Status"
              value={formatStatus(
                request.hr_status || '-'
              )}
            />
          </div>

          {(request.job_pending ||
            request.handover_to ||
            request.handover_note) && (
            <div className="mt-4 rounded-2xl bg-[#f5f5f7]/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#86868b]">
                Job Pending
              </p>

              <p className="mt-2 text-sm leading-6 text-[#1d1d1f]">
                {request.job_pending ||
                  '-'}
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SmallInfo
                  label="Dialihkan Kepada"
                  value={
                    request.handover_to ||
                    '-'
                  }
                />

                <SmallInfo
                  label="Catatan"
                  value={
                    request.handover_note ||
                    '-'
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 xl:min-w-[170px]">
          {request.proof_file_url ? (
            <a
              href={
                request.proof_file_url
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8] transition hover:bg-blue-100"
            >
              <FileText
                size={15}
              />

              Lihat Bukti
            </a>
          ) : (
            <span className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-[#f5f5f7] px-4 text-xs font-bold text-[#86868b]">
              Tidak ada bukti
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function PHLBalanceCard({
  record,
}: {
  record: PHLRecord
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-[#f7edfc]/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#1d1d1f]">
            {formatDisplayDate(
              record.phl_date || ''
            )}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
            Expired:{' '}
            {formatDisplayDate(
              record.expired_at || ''
            )}
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#7b2cbf]">
          {record.remaining_days || 0}{' '}
          hari
        </span>
      </div>

      {record.reason && (
        <p className="mt-3 text-xs leading-5 text-[#6e6e73]">
          {record.reason}
        </p>
      )}
    </div>
  )
}

function EmployeeIdentity({
  employee,
  supervisorOne,
  supervisorTwo,
}: {
  employee: Employee | null
  supervisorOne: Employee | null
  supervisorTwo: Employee | null
}) {
  return (
    <div className="rounded-[26px] border border-black/5 bg-[#f5f5f7]/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#007aff] shadow-sm">
            <UserRound
              size={20}
            />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[#1d1d1f]">
              {employee?.full_name ||
                employee?.email ||
                'Employee'}
            </h3>

            <p className="mt-1 truncate text-xs text-[#6e6e73]">
              {employee?.employee_number ||
                '-'}{' '}
              ·{' '}
              {employee?.department ||
                '-'}{' '}
              ·{' '}
              {employee?.position ||
                '-'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 text-xs sm:grid-cols-2 lg:min-w-[420px]">
          <AutoReadInfo
            label="Atasan 1"
            value={
              supervisorOne?.full_name ||
              employee?.supervisor_1 ||
              '-'
            }
          />

          <AutoReadInfo
            label="Atasan 2"
            value={
              supervisorTwo?.full_name ||
              employee?.supervisor_2 ||
              '-'
            }
          />
        </div>
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
  icon: ReactNode
  children: ReactNode
}) {
  const className =
    tone === 'green'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-orange-200 bg-orange-50 text-orange-700'

  return (
    <div
      className={`rounded-2xl border p-4 text-sm leading-6 ${className}`}
    >
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
  icon: ReactNode
  tone:
    | 'blue'
    | 'green'
    | 'orange'
    | 'purple'
}) {
  const toneClass = {
    blue:
      'bg-[#e8f2ff] text-[#007aff]',

    green:
      'bg-green-50 text-green-700',

    orange:
      'bg-orange-50 text-orange-700',

    purple:
      'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className="harmony-card harmony-hover-lift p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[28px]">
            {value}
          </h3>

          <p className="mt-2 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div
          className={`rounded-2xl p-3 ${toneClass}`}
        >
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
    <div className="rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold text-white/50">
        {label}
      </p>

      <p className="mt-1 break-words text-xl font-semibold text-white">
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
  tone:
    | 'green'
    | 'orange'
    | 'red'
    | 'blue'
    | 'purple'
    | 'neutral'
}) {
  const className = {
    green:
      'bg-green-50 text-green-700',

    orange:
      'bg-orange-50 text-orange-700',

    red:
      'bg-red-50 text-red-700',

    blue:
      'bg-[#e8f2ff] text-[#0059b8]',

    purple:
      'bg-[#f7edfc] text-[#7b2cbf]',

    neutral:
      'bg-[#f5f5f7] text-[#6e6e73]',
  }[tone]

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}
    >
      {label}
    </span>
  )
}

function InfoTile({
  label,
  value,
  description,
  tone,
}: {
  label: string
  value: string
  description: string
  tone:
    | 'blue'
    | 'green'
    | 'purple'
}) {
  const className = {
    blue:
      'bg-[#e8f2ff] text-[#0059b8]',

    green:
      'bg-green-50 text-green-700',

    purple:
      'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div
      className={`rounded-[22px] p-4 ${className}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold opacity-75">
        {description}
      </p>
    </div>
  )
}

function AutoReadInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <p className="font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>

      <p className="mt-1 truncate font-semibold text-[#1d1d1f]">
        {value}
      </p>
    </div>
  )
}

function SmallInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f5f5f7]/75 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-[#1d1d1f]">
        {value}
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-black/5 bg-[#f5f5f7]/70 p-5 text-sm text-[#6e6e73]">
      <Loader2
        size={18}
        className="animate-spin"
      />

      Memuat data...
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-6 text-center">
      <p className="text-sm font-bold text-[#1d1d1f]">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6e6e73]">
        {description}
      </p>
    </div>
  )
}

function formatEmployeeOption(
  employee: Employee
) {
  const name =
    employee.full_name ||
    employee.email ||
    'Tanpa Nama'

  const employeeNumber =
    employee.employee_number ||
    employee.machine_pin ||
    'Tanpa NIP'

  const department =
    employee.department ||
    'Tanpa Unit'

  const email =
    employee.email ||
    'Tanpa Email'

  return `${name} · ${employeeNumber} · ${department} · ${email}`
}

function getRequestMeta(
  type: RequestType
) {
  const meta =
    getHarmonyRequestTypeMeta(type)

  return {
    ...meta,
    category:
      meta.request_category,
  }
}

function countWorkingDays(
  start: string,
  end: string,
  holidays: Holiday[]
) {
  if (
    !start ||
    !end ||
    end < start
  ) {
    return 0
  }

  const holidaySet =
    new Set(
      holidays
        .filter(
          (item) =>
            item.is_active !==
            false
        )
        .map(
          (item) =>
            item.holiday_date
        )
    )

  const current =
    new Date(
      `${start}T00:00:00`
    )

  const endDate =
    new Date(
      `${end}T00:00:00`
    )

  let total = 0

  while (
    current <= endDate
  ) {
    const iso =
      formatDateToISO(
        current
      )

    const day =
      current.getDay()

    const weekend =
      day === 0 ||
      day === 6

    const holiday =
      holidaySet.has(iso)

    if (
      !weekend &&
      !holiday
    ) {
      total += 1
    }

    current.setDate(
      current.getDate() +
        1
    )
  }

  return total
}

function getTodayISO() {
  return formatDateToISO(
    new Date()
  )
}

function formatDateToISO(
  date: Date
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    )

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    )

  return `${year}-${month}-${day}`
}

function formatDisplayDate(
  value: string
) {
  if (!value) {
    return '-'
  }

  const date =
    new Date(
      `${value}T00:00:00`
    )

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return date.toLocaleDateString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  )
}

function formatDateTime(
  value: string
) {
  if (!value) {
    return '-'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '-'
  }

  return date.toLocaleString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  )
}

function normalizeText(
  value?:
    | string
    | null
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
}

function isPendingStatus(
  value?:
    | string
    | null
) {
  const normalized =
    normalizeText(value)

  return (
    normalized === 'pending' ||
    normalized === 'waiting_supervisor' ||
    normalized === 'pending_supervisor' ||
    normalized === 'pending_hr'
  )
}

function formatStatus(
  value?:
    | string
    | null
) {
  const normalized =
    normalizeText(value)

  const map:
    Record<
      string,
      string
    > = {
    pending:
      'Menunggu Approval',

    waiting_supervisor:
      'Menunggu Atasan',

    pending_supervisor:
      'Menunggu Atasan',

    pending_hr:
      'Menunggu HR',

    approved:
      'Disetujui',

    rejected:
      'Ditolak',

    cancelled:
      'Dibatalkan',

    leave:
      'Cuti',

    sick:
      'Sakit',

    permit:
      'Izin',

    official_travel:
      'Tugas Luar',

    phl_claim:
      'Klaim PHL',
  }

  return (
    map[normalized] ||
    value ||
    '-'
  )
}

function getStatusTone(
  status?:
    | string
    | null
):
  | 'green'
  | 'orange'
  | 'red'
  | 'blue'
  | 'purple'
  | 'neutral' {
  const value =
    normalizeText(status)

  if (
    value === 'approved'
  ) {
    return 'green'
  }

  if (
    value === 'rejected' ||
    value === 'cancelled'
  ) {
    return 'red'
  }

  if (
    value === 'pending_hr'
  ) {
    return 'blue'
  }

  if (
    value === 'phl_claim'
  ) {
    return 'purple'
  }

  if (
    isPendingStatus(value)
  ) {
    return 'orange'
  }

  return 'neutral'
}