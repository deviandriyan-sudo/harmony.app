'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Plane,
  RefreshCcw,
  Send,
  Upload,
  UserCheck,
  UserRound,
  WalletCards,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

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
  is_active: boolean | null
  join_date?: string | null
}

type AnnualLeaveSummary = {
  employee_id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  total_earned_days: number | null
  total_used_days: number | null
  total_postponed_days: number | null
  total_remaining_days: number | null
  latest_matured_date: string | null
  active_cycle_count: number | null
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

type RequestType =
  | 'annual_leave'
  | 'sick'
  | 'permit'
  | 'official_travel'
  | 'phl_claim'
  | 'other_leave'
  | 'marriage_leave'
  | 'maternity_leave'
  | 'miscarriage_leave'
  | 'bereavement_leave'
  | 'child_circumcision_leave'
  | 'worship_leave'
  | 'menstrual_leave'
  | 'pregnancy_check_leave'

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

export default function EmployeeLeavePage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [supervisorOne, setSupervisorOne] = useState<Employee | null>(null)
  const [supervisorTwo, setSupervisorTwo] = useState<Employee | null>(null)

  const [annualLeave, setAnnualLeave] = useState<AnnualLeaveSummary | null>(null)
  const [phlRecords, setPhlRecords] = useState<PHLRecord[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])

  const [form, setForm] = useState<FormState>(initialForm)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const annualRemaining = Number(annualLeave?.total_remaining_days || 0)

  const phlRemaining = useMemo(() => {
    return phlRecords.reduce((sum, item) => {
      return sum + Number(item.remaining_days || 0)
    }, 0)
  }, [phlRecords])

  const pendingCount = useMemo(() => {
    return leaveRequests.filter((item) => {
      return (
        normalizeText(item.status) === 'pending' ||
        normalizeText(item.supervisor_status) === 'pending' ||
        normalizeText(item.hr_status) === 'pending'
      )
    }).length
  }, [leaveRequests])

  const approvedCount = useMemo(() => {
    return leaveRequests.filter((item) => {
      return (
        normalizeText(item.status) === 'approved' ||
        normalizeText(item.supervisor_status) === 'approved' ||
        normalizeText(item.hr_status) === 'approved'
      )
    }).length
  }, [leaveRequests])

  const calculatedDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0

    return countWorkingDays(form.start_date, form.end_date, holidays)
  }, [form.start_date, form.end_date, holidays])

  const selectedRequestMeta = getRequestMeta(form.request_type)

  const requiresProof =
    form.request_type === 'sick' ||
    form.request_type === 'official_travel' ||
    form.request_type === 'phl_claim' ||
    form.request_type === 'other_leave' ||
    form.request_type === 'marriage_leave' ||
    form.request_type === 'maternity_leave' ||
    form.request_type === 'miscarriage_leave' ||
    form.request_type === 'bereavement_leave' ||
    form.request_type === 'child_circumcision_leave' ||
    form.request_type === 'worship_leave' ||
    form.request_type === 'pregnancy_check_leave'

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setSuccessMessage('')
    setErrorMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage('Session user belum ditemukan. Silakan login ulang.')
      setLoading(false)
      return
    }

    const { data: appUserData, error: appUserError } = await supabase
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
      setErrorMessage('Akun belum terhubung ke data employee. Silakan hubungi HR.')
      setLoading(false)
      return
    }

    setAppUser(appUserData)

    const { data: employeeData, error: employeeError } = await supabase
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

    await Promise.all([
      fetchSupervisorData(employeeData),
      fetchAnnualLeaveSummary(employeeData.id),
      fetchPHLBalance(employeeData.id),
      fetchLeaveRequests(employeeData.id),
      fetchHolidays(),
    ])

    setLoading(false)
  }

  async function fetchSupervisorData(employeeData: Employee) {
    const supervisorOneKey = normalizeText(employeeData.supervisor_1)
    const supervisorTwoKey = normalizeText(employeeData.supervisor_2)

    if (!supervisorOneKey && !supervisorTwoKey) {
      setSupervisorOne(null)
      setSupervisorTwo(null)
      return
    }

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)

    const employeeList = data || []

    const foundOne = employeeList.find((item) => {
      return (
        normalizeText(item.id) === supervisorOneKey ||
        normalizeText(item.full_name) === supervisorOneKey ||
        normalizeText(item.employee_number) === supervisorOneKey ||
        normalizeText(item.email) === supervisorOneKey
      )
    }) || null

    const foundTwo = employeeList.find((item) => {
      return (
        normalizeText(item.id) === supervisorTwoKey ||
        normalizeText(item.full_name) === supervisorTwoKey ||
        normalizeText(item.employee_number) === supervisorTwoKey ||
        normalizeText(item.email) === supervisorTwoKey
      )
    }) || null

    setSupervisorOne(foundOne)
    setSupervisorTwo(foundTwo)
  }

  async function fetchAnnualLeaveSummary(employeeId: string) {
    await supabase.rpc('sync_employee_annual_leave_balance', {
      p_employee_id: employeeId,
      p_reference_date: getTodayISO(),
    })

    const { data } = await supabase
      .from('employee_annual_leave_summary')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle<AnnualLeaveSummary>()

    setAnnualLeave(data || null)
  }

  async function fetchPHLBalance(employeeId: string) {
    const { data } = await supabase
      .from('phl_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .gt('remaining_days', 0)
      .gte('expired_at', getTodayISO())
      .order('expired_at', { ascending: true })

    setPhlRecords(data || [])
  }

  async function fetchLeaveRequests(employeeId: string) {
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    setLeaveRequests(data || [])
  }

  async function fetchHolidays() {
    const year = new Date().getFullYear()

    const { data } = await supabase
      .from('holidays')
      .select('*')
      .eq('is_active', true)
      .gte('holiday_date', `${year - 1}-01-01`)
      .lte('holiday_date', `${year + 1}-12-31`)
      .order('holiday_date', { ascending: true })

    setHolidays(data || [])
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  async function uploadProofFile(file: File | null) {
    if (!file) {
      return {
        url: '',
        name: '',
        size: 0,
        type: '',
        error: '',
      }
    }

    const cleanName = file.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.-]/g, '')

    const path = `leave-requests/${Date.now()}-${crypto.randomUUID()}-${cleanName || 'file'}`

    const { error } = await supabase.storage
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

    const { data } = supabase.storage
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
    if (!employee || !form.start_date || !form.end_date) return false

    const { data, error } = await supabase.rpc('is_employee_date_range_locked', {
      p_employee_id: employee.id,
      p_start_date: form.start_date,
      p_end_date: form.end_date,
    })

    if (error) {
      return false
    }

    return Boolean(data)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSuccessMessage('')
    setErrorMessage('')

    if (!appUser || !employee) {
      setErrorMessage('Data user belum lengkap.')
      setSubmitting(false)
      return
    }

    if (!form.start_date || !form.end_date) {
      setErrorMessage('Tanggal mulai dan tanggal selesai wajib diisi.')
      setSubmitting(false)
      return
    }

    if (form.end_date < form.start_date) {
      setErrorMessage('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.')
      setSubmitting(false)
      return
    }

    if (calculatedDays <= 0) {
      setErrorMessage('Jumlah hari pengajuan harus lebih dari 0 hari kerja.')
      setSubmitting(false)
      return
    }

    if (!form.reason.trim()) {
      setErrorMessage('Alasan pengajuan wajib diisi.')
      setSubmitting(false)
      return
    }

    if (!form.job_pending.trim()) {
      setErrorMessage('Job pending wajib diisi agar pekerjaan tetap terpantau saat karyawan tidak masuk.')
      setSubmitting(false)
      return
    }

    if (!form.handover_to.trim()) {
      setErrorMessage('Kolom ditujukan/dialihkan ke siapa wajib diisi.')
      setSubmitting(false)
      return
    }

    if (requiresProof && !form.proof_file) {
      setErrorMessage(`${selectedRequestMeta.label} wajib melampirkan bukti/dokumen pendukung.`)
      setSubmitting(false)
      return
    }

    const isLocked = await checkLockedPeriod()

    if (isLocked) {
      setErrorMessage('Tanggal pengajuan masuk periode absensi yang sudah dikunci HR. Hubungi HR jika perlu revisi.')
      setSubmitting(false)
      return
    }

    if (form.request_type === 'annual_leave' && calculatedDays > annualRemaining) {
      setErrorMessage(`Saldo cuti tahunan tidak cukup. Sisa saldo saat ini ${annualRemaining} hari.`)
      setSubmitting(false)
      return
    }

    if (form.request_type === 'phl_claim' && calculatedDays > phlRemaining) {
      setErrorMessage(`Saldo PHL tidak cukup. Sisa saldo PHL saat ini ${phlRemaining} hari.`)
      setSubmitting(false)
      return
    }

    const uploaded = await uploadProofFile(form.proof_file)

    if (uploaded.error) {
      setErrorMessage(uploaded.error)
      setSubmitting(false)
      return
    }

    const now = new Date().toISOString()

    const payload = {
      employee_id: employee.id,
      employee_number: employee.employee_number,
      machine_pin: employee.machine_pin,
      full_name: employee.full_name,
      department: employee.department,
      position: employee.position,
      email: employee.email || appUser.email,

      request_category: selectedRequestMeta.category,
      leave_type: selectedRequestMeta.label,
      request_type: form.request_type,

      start_date: form.start_date,
      end_date: form.end_date,
      total_days: calculatedDays,

      reason: form.reason.trim(),
      job_pending: form.job_pending.trim(),
      handover_to: form.handover_to.trim(),
      handover_note: form.handover_note.trim() || null,

      proof_file_url: uploaded.url || null,
      proof_file_name: uploaded.name || null,
      proof_file_size: uploaded.size || null,
      proof_file_type: uploaded.type || null,

      status: 'pending',
      supervisor_status: 'pending',
      supervisor_id: supervisorOne?.id || null,
      supervisor_name: supervisorOne?.full_name || employee.supervisor_1 || null,
      hr_status: 'pending',
      source: 'employee_self_service',

      is_locked: false,
      updated_at: now,
      created_at: now,
    }

    const { error } = await supabase
      .from('leave_requests')
      .insert(payload)

    if (error) {
      setErrorMessage(error.message)
      setSubmitting(false)
      return
    }

    setSuccessMessage(`${selectedRequestMeta.label} berhasil diajukan dan menunggu approval atasan.`)
    setForm(initialForm)
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
        description="Ajukan cuti, izin, sakit, tugas luar, dan klaim PHL dengan saldo yang tersinkron otomatis."
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
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <CalendarDays size={15} className="text-[#5ac8fa]" />
                Employee Leave Request
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Cuti, Izin & PHL
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Sisa cuti tahunan dan saldo PHL sudah tersinkron dari database.
                Hari libur, Sabtu, dan Minggu tidak dihitung sebagai jatah cuti.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[720px]">
              <HeroMetric label="Cuti Tahunan" value={`${annualRemaining} hari`} />
              <HeroMetric label="Saldo PHL" value={`${phlRemaining} hari`} />
              <HeroMetric label="Pending" value={String(pendingCount)} />
              <HeroMetric label="Approved" value={String(approvedCount)} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Sisa Cuti Tahunan"
            value={`${annualRemaining} hari`}
            description={
              annualLeave?.latest_matured_date
                ? `Matang terakhir: ${formatDisplayDate(annualLeave.latest_matured_date)}`
                : 'Belum ada cycle cuti aktif'
            }
            icon={<WalletCards size={22} />}
            tone="blue"
          />

          <SummaryCard
            title="Sisa PHL"
            value={`${phlRemaining} hari`}
            description="Saldo PHL aktif dan belum expired"
            icon={<Plane size={22} />}
            tone="purple"
          />

          <SummaryCard
            title="Menunggu Approval"
            value={`${pendingCount}`}
            description="Pengajuan yang belum final"
            icon={<Clock3 size={22} />}
            tone="orange"
          />

          <SummaryCard
            title="Atasan Approval"
            value={supervisorOne?.full_name || employee?.supervisor_1 || '-'}
            description={supervisorTwo?.full_name ? `Atasan 2: ${supervisorTwo.full_name}` : 'Atasan dari data karyawan'}
            icon={<UserCheck size={22} />}
            tone="green"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="harmony-card overflow-hidden">
            <div className="border-b border-black/5 p-6">
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Form Pengajuan Cuti / Izin / PHL
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                Isi form pengajuan. Tombol submit ada di bagian bawah form dan tidak hilang walaupun data saldo masih refresh.
              </p>
            </div>

            <div className="space-y-5 p-6">
              {loading && (
                <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/70 p-4 text-sm text-[#6e6e73]">
                  <Loader2 size={18} className="animate-spin" />
                  Memuat data saldo, atasan, dan riwayat...
                </div>
              )}

              <EmployeeIdentity
                employee={employee}
                supervisorOne={supervisorOne}
                supervisorTwo={supervisorTwo}
              />

              <label className="block">
                <span className="harmony-label">Jenis Pengajuan</span>
                <select
                  value={form.request_type}
                  onChange={(event) => updateForm('request_type', event.target.value as RequestType)}
                  className="harmony-select"
                >
                  <option value="annual_leave">Cuti Tahunan</option>
                  <option value="marriage_leave">Cuti Menikah</option>
                  <option value="maternity_leave">Cuti Melahirkan</option>
                  <option value="miscarriage_leave">Cuti Keguguran</option>
                  <option value="bereavement_leave">Cuti Duka</option>
                  <option value="child_circumcision_leave">Cuti Khitan / Baptis Anak</option>
                  <option value="worship_leave">Cuti Ibadah</option>
                  <option value="menstrual_leave">Cuti Haid</option>
                  <option value="pregnancy_check_leave">Pemeriksaan Kehamilan</option>
                  <option value="sick">Sakit</option>
                  <option value="permit">Izin</option>
                  <option value="official_travel">Tugas Luar / Dinas</option>
                  <option value="phl_claim">Klaim PHL</option>
                  <option value="other_leave">Cuti Lainnya</option>
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="harmony-label">Tanggal Mulai</span>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(event) => updateForm('start_date', event.target.value)}
                    className="harmony-input"
                  />
                </label>

                <label className="block">
                  <span className="harmony-label">Tanggal Selesai</span>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(event) => updateForm('end_date', event.target.value)}
                    className="harmony-input"
                  />
                </label>
              </div>

              <div className="rounded-[24px] border border-black/5 bg-[#f5f5f7]/80 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#1d1d1f]">
                      Jumlah Hari Pengajuan
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
                      Sabtu, Minggu, dan libur aktif HR tidak dihitung.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3 text-2xl font-semibold text-[#007aff] shadow-sm">
                    {calculatedDays}
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="harmony-label">Alasan Pengajuan</span>
                <textarea
                  value={form.reason}
                  onChange={(event) => updateForm('reason', event.target.value)}
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
                    <h3 className="text-base font-semibold text-[#1d1d1f]">
                      Job Pending & Handover
                    </h3>
                    <p className="text-xs leading-5 text-[#6e6e73]">
                      Diisi agar fungsi kerja tetap berjalan selama karyawan tidak masuk.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="harmony-label">Job Pending</span>
                    <textarea
                      value={form.job_pending}
                      onChange={(event) => updateForm('job_pending', event.target.value)}
                      placeholder="Contoh: Rekap absensi periode berjalan, follow up dokumen vendor, update data karyawan."
                      className="harmony-textarea"
                    />
                  </label>

                  <label className="block">
                    <span className="harmony-label">Dialihkan / Ditujukan Kepada</span>
                    <input
                      value={form.handover_to}
                      onChange={(event) => updateForm('handover_to', event.target.value)}
                      placeholder="Nama rekan kerja / atasan yang menerima handover."
                      className="harmony-input"
                    />
                  </label>

                  <label className="block">
                    <span className="harmony-label">Catatan Handover</span>
                    <textarea
                      value={form.handover_note}
                      onChange={(event) => updateForm('handover_note', event.target.value)}
                      placeholder="Instruksi tambahan untuk pekerjaan yang dialihkan."
                      className="harmony-textarea"
                    />
                  </label>
                </div>
              </div>

              <FileUploadBox
                required={requiresProof}
                file={form.proof_file}
                onChange={(file) => updateForm('proof_file', file)}
                title="Upload Bukti / Dokumen Pendukung"
                description={
                  requiresProof
                    ? `${selectedRequestMeta.label} wajib melampirkan dokumen pendukung.`
                    : 'Opsional untuk cuti tahunan, izin, cuti haid, atau kebutuhan tertentu.'
                }
              />

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="harmony-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {submitting ? 'Mengirim Pengajuan...' : 'Submit Pengajuan Cuti / Izin / PHL'}
              </button>
            </div>
          </div>

          <div className="harmony-card overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-black/5 p-6">
              <div>
                <h2 className="text-lg font-semibold text-[#1d1d1f]">
                  Riwayat Pengajuan
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  Cuti, izin, sakit, tugas luar, dan klaim PHL yang pernah diajukan.
                </p>
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

            <LeaveRequestList requests={leaveRequests} />
          </div>
        </div>
      </section>
    </>
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
    <div className="rounded-[28px] border border-black/5 bg-[#1d1d1f] p-5 text-white">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10">
          <UserRound size={24} />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">
            {employee?.full_name || '-'}
          </h3>

          <p className="mt-1 text-sm text-white/55">
            {employee?.employee_number || '-'} · {employee?.department || '-'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white/10 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">
            Atasan 1
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {supervisorOne?.full_name || employee?.supervisor_1 || '-'}
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">
            Atasan 2
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {supervisorTwo?.full_name || employee?.supervisor_2 || '-'}
          </p>
        </div>
      </div>
    </div>
  )
}

function LeaveRequestList({
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
            Belum ada pengajuan
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
            Riwayat cuti, izin, sakit, tugas luar, dan klaim PHL akan muncul di sini.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-black/5">
      {requests.map((item) => (
        <div
          key={item.id}
          className="p-5 transition hover:bg-[#f5f5f7]/65"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={item.leave_type || formatRequestType(item.request_type || '')}
                  tone="blue"
                />

                <StatusBadge
                  label={formatApprovalStatus(item.supervisor_status || item.status || '')}
                  tone={getApprovalTone(item.supervisor_status || item.status || '')}
                />

                <StatusBadge
                  label={formatHRStatus(item.hr_status || '')}
                  tone={getHRTone(item.hr_status || '')}
                />
              </div>

              <h3 className="mt-3 text-base font-semibold text-[#1d1d1f]">
                {formatDisplayDate(item.start_date || '')} - {formatDisplayDate(item.end_date || '')}
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                {Number(item.total_days || 0)} hari kerja · {item.reason || '-'}
              </p>

              <p className="mt-1 text-xs font-semibold text-[#007aff]">
                Atasan approval: {item.supervisor_name || '-'}
              </p>

              {item.job_pending && (
                <p className="mt-2 rounded-2xl bg-[#f5f5f7] px-4 py-3 text-xs leading-5 text-[#6e6e73]">
                  <strong className="text-[#1d1d1f]">Job pending:</strong> {item.job_pending}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2 xl:items-end">
              <p className="text-xs text-[#86868b]">
                Diajukan: {formatDateTime(item.created_at || '')}
              </p>

              {item.proof_file_url && (
                <a
                  href={item.proof_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
                >
                  <FileText size={15} />
                  Lihat Bukti
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function FileUploadBox({
  required,
  file,
  title,
  description,
  onChange,
}: {
  required: boolean
  file: File | null
  title: string
  description: string
  onChange: (file: File | null) => void
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold text-[#1d1d1f]">
            {title} {required && <span className="text-red-600">*</span>}
          </h3>

          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
            {description}
          </p>

          <p className="mt-1 text-xs font-bold text-[#007aff]">
            {file?.name || 'Belum ada file dipilih'}
          </p>
        </div>

        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#007aff] shadow-sm transition hover:bg-[#e8f2ff]">
          <Upload size={17} />
          Pilih File
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(event) => onChange(event.target.files?.[0] || null)}
          />
        </label>
      </div>
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

          <h3 className="mt-2 truncate text-xl font-semibold tracking-tight text-[#1d1d1f]">
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

function getRequestMeta(type: RequestType) {
  const map = {
    annual_leave: { label: 'Cuti Tahunan', category: 'leave' },
    marriage_leave: { label: 'Cuti Menikah', category: 'leave' },
    maternity_leave: { label: 'Cuti Melahirkan', category: 'leave' },
    miscarriage_leave: { label: 'Cuti Keguguran', category: 'leave' },
    bereavement_leave: { label: 'Cuti Duka', category: 'leave' },
    child_circumcision_leave: { label: 'Cuti Khitan / Baptis Anak', category: 'leave' },
    worship_leave: { label: 'Cuti Ibadah', category: 'leave' },
    menstrual_leave: { label: 'Cuti Haid', category: 'leave' },
    pregnancy_check_leave: { label: 'Pemeriksaan Kehamilan', category: 'leave' },
    sick: { label: 'Sakit', category: 'sick' },
    permit: { label: 'Izin', category: 'permit' },
    official_travel: { label: 'Tugas Luar / Dinas', category: 'official_travel' },
    phl_claim: { label: 'Klaim PHL', category: 'phl_claim' },
    other_leave: { label: 'Cuti Lainnya', category: 'leave' },
  }

  return map[type]
}

function countWorkingDays(start: string, end: string, holidays: Holiday[]) {
  if (!start || !end || end < start) return 0

  const holidaySet = new Set(
    holidays
      .filter((item) => item.is_active !== false)
      .map((item) => item.holiday_date)
  )

  const current = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)

  let total = 0

  while (current <= endDate) {
    const iso = formatDateToISO(current)
    const day = current.getDay()
    const weekend = day === 0 || day === 6
    const holiday = holidaySet.has(iso)

    if (!weekend && !holiday) {
      total += 1
    }

    current.setDate(current.getDate() + 1)
  }

  return total
}

function getTodayISO() {
  return formatDateToISO(new Date())
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

function formatApprovalStatus(value: string) {
  const normalized = normalizeText(value)

  if (normalized === 'approved') return 'Disetujui Atasan'
  if (normalized === 'rejected') return 'Ditolak Atasan'
  if (normalized === 'pending') return 'Menunggu Atasan'

  return 'Menunggu'
}

function formatHRStatus(value: string) {
  const normalized = normalizeText(value)

  if (normalized === 'approved') return 'Approved HR'
  if (normalized === 'rejected') return 'Rejected HR'
  if (normalized === 'pending') return 'Menunggu HR'

  return 'Menunggu HR'
}

function getApprovalTone(value: string): 'green' | 'orange' | 'red' | 'neutral' {
  const normalized = normalizeText(value)

  if (normalized === 'approved') return 'green'
  if (normalized === 'rejected') return 'red'
  if (normalized === 'pending') return 'orange'

  return 'neutral'
}

function getHRTone(value: string): 'green' | 'orange' | 'red' | 'neutral' {
  const normalized = normalizeText(value)

  if (normalized === 'approved') return 'green'
  if (normalized === 'rejected') return 'red'
  if (normalized === 'pending') return 'orange'

  return 'neutral'
}