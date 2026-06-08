'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  X,
  Save,
  Clock3,
  ShieldCheck,
  CalendarDays,
  Fingerprint,
  Download,
  BadgeCheck,
  Ban,
  WalletCards,
  RotateCcw,
  TimerReset,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/employee'

type AttendanceLog = {
  id: string
  employee_id: string | null
  employee_number: string | null
  machine_pin: string
  full_name: string | null
  department: string | null
  position: string | null
  attendance_date: string
  check_in: string | null
  check_out: string | null
  status: string | null
}

type Holiday = {
  id: string
  holiday_date: string
  holiday_name: string
  holiday_type: string | null
  is_active: boolean | null
}

type PHLRecord = {
  id: string

  employee_id: string | null
  employee_number: string | null
  machine_pin: string

  full_name: string | null
  department: string | null
  position: string | null

  phl_date: string

  attendance_log_id: string | null
  check_in: string | null
  check_out: string | null

  source: string | null
  status: string | null
  reason: string | null

  balance_days: number | null
  used_days: number | null
  remaining_days: number | null

  valid_from: string | null
  expired_at: string | null

  proof_file_url: string | null
  proof_file_name: string | null
  proof_file_size: number | null
  proof_file_type: string | null

  approved_by: string | null
  approved_at: string | null

  notes: string | null

  created_at: string | null
  updated_at: string | null
}

type PHLForm = {
  employee_id: string
  phl_date: string
  balance_days: number
  notes: string
}

const initialForm: PHLForm = {
  employee_id: '',
  phl_date: '',
  balance_days: 1,
  notes: '',
}

export default function HRPHLPage() {
  const [activeTab, setActiveTab] = useState<'approval' | 'balance'>('approval')

  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<PHLRecord[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])

  const [search, setSearch] = useState('')
  const [balanceSearch, setBalanceSearch] = useState('')

  const [statusFilter, setStatusFilter] = useState('all')
  const [balanceStatusFilter, setBalanceStatusFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [form, setForm] = useState<PHLForm>(initialForm)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (employeeError) {
      setErrorMessage(employeeError.message)
      setEmployees([])
      setLoading(false)
      return
    }

    const { data: holidayData, error: holidayError } = await supabase
      .from('holidays')
      .select('*')
      .eq('is_active', true)
      .order('holiday_date', { ascending: true })

    if (holidayError) {
      setErrorMessage(holidayError.message)
      setHolidays([])
      setLoading(false)
      return
    }

    const { data: phlData, error: phlError } = await supabase
      .from('phl_records')
      .select('*')
      .order('phl_date', { ascending: false })
      .order('full_name', { ascending: true })

    if (phlError) {
      setErrorMessage(phlError.message)
      setRecords([])
      setLoading(false)
      return
    }

    setEmployees(employeeData || [])
    setHolidays(holidayData || [])
    setRecords(phlData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function updateForm(field: keyof PHLForm, value: string | number) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setSelectedFile(null)
    setShowForm(false)
    setErrorMessage('')
  }

  function handleAddNew() {
    setForm(initialForm)
    setSelectedFile(null)
    setShowForm(true)
    setErrorMessage('')
    setSuccessMessage('')
    setActiveTab('approval')
  }

  function validateFile(file: File) {
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp']
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!extension || !allowedExtensions.includes(extension)) {
      return 'Format bukti harus PDF, JPG, JPEG, PNG, atau WEBP.'
    }

    const maxSizeInMb = 10
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024

    if (file.size > maxSizeInBytes) {
      return `Ukuran bukti maksimal ${maxSizeInMb} MB.`
    }

    return ''
  }

  async function uploadProof(file: File) {
    const extension = file.name.split('.').pop()
    const safeName = file.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')

    const filePath = `phl/${Date.now()}-${safeName}`

    const { error } = await supabase.storage
      .from('phl-proofs')
      .upload(filePath, file)

    if (error) {
      return {
        url: '',
        fileType: '',
        error: error.message,
      }
    }

    const { data } = supabase.storage
      .from('phl-proofs')
      .getPublicUrl(filePath)

    return {
      url: data.publicUrl,
      fileType: extension || file.type || 'unknown',
      error: '',
    }
  }

  function addDays(dateString: string, days: number) {
    const date = new Date(`${dateString}T00:00:00`)
    date.setDate(date.getDate() + days)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getToday() {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function isWeekend(dateString: string) {
    const date = new Date(`${dateString}T00:00:00`)
    const day = date.getDay()

    return day === 0 || day === 6
  }

  function getHoliday(dateString: string) {
    return holidays.find((holiday) => holiday.holiday_date === dateString)
  }

  function getPHLReason(dateString: string) {
    const holiday = getHoliday(dateString)

    if (holiday) {
      return `Masuk kerja pada hari libur: ${holiday.holiday_name}`
    }

    if (isWeekend(dateString)) {
      return 'Masuk kerja pada hari Sabtu/Minggu'
    }

    return ''
  }

  function getBalanceStatus(record: PHLRecord) {
    const today = getToday()
    const expiredAt = record.expired_at || ''
    const remainingDays = Number(record.remaining_days ?? record.balance_days ?? 0)

    if (remainingDays <= 0) {
      return 'used'
    }

    if (expiredAt && expiredAt < today) {
      return 'expired'
    }

    return 'active'
  }

  function getDaysLeft(expiredAt: string | null) {
    if (!expiredAt) return null

    const today = new Date(`${getToday()}T00:00:00`)
    const expired = new Date(`${expiredAt}T00:00:00`)

    const diff = expired.getTime() - today.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    return days
  }

  async function syncPHLCandidates() {
    setSyncing(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .not('check_in', 'is', null)
      .order('attendance_date', { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      setSyncing(false)
      return
    }

    const attendanceLogs = (data || []) as AttendanceLog[]

    const candidates = attendanceLogs
      .map((log) => {
        const reason = getPHLReason(log.attendance_date)

        if (!reason) return null

        return {
          employee_id: log.employee_id,
          employee_number: log.employee_number,
          machine_pin: log.machine_pin,

          full_name: log.full_name,
          department: log.department,
          position: log.position,

          phl_date: log.attendance_date,

          attendance_log_id: log.id,
          check_in: log.check_in,
          check_out: log.check_out,

          source: 'auto_candidate',
          status: 'pending_proof',
          reason,

          balance_days: 1,
          used_days: 0,
          remaining_days: 1,

          valid_from: log.attendance_date,
          expired_at: addDays(log.attendance_date, 90),

          notes: 'Kandidat PHL otomatis dari data absensi. Menunggu bukti ST/perintah atasan.',
          updated_at: new Date().toISOString(),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (candidates.length === 0) {
      setSuccessMessage('Tidak ditemukan kandidat PHL dari data absensi.')
      setSyncing(false)
      return
    }

    const { error: upsertError } = await supabase
      .from('phl_records')
      .upsert(candidates, {
        onConflict: 'machine_pin,phl_date',
        ignoreDuplicates: true,
      })

    if (upsertError) {
      setErrorMessage(upsertError.message)
      setSyncing(false)
      return
    }

    setSuccessMessage(`${candidates.length} kandidat PHL berhasil disinkronkan dari data absensi.`)
    setSyncing(false)
    await fetchData()
  }

  async function findAttendanceLog(employee: Employee, phlDate: string) {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('machine_pin', employee.machine_pin)
      .eq('attendance_date', phlDate)
      .maybeSingle()

    if (error) {
      return {
        data: null,
        error: error.message,
      }
    }

    return {
      data: data as AttendanceLog | null,
      error: '',
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.employee_id) {
      setErrorMessage('Karyawan wajib dipilih.')
      setSaving(false)
      return
    }

    if (!form.phl_date) {
      setErrorMessage('Tanggal PHL wajib diisi.')
      setSaving(false)
      return
    }

    if (!selectedFile) {
      setErrorMessage('Bukti ST/perintah atasan wajib diunggah.')
      setSaving(false)
      return
    }

    if (form.balance_days <= 0) {
      setErrorMessage('Jumlah hari PHL harus lebih dari 0.')
      setSaving(false)
      return
    }

    const fileValidation = validateFile(selectedFile)

    if (fileValidation) {
      setErrorMessage(fileValidation)
      setSaving(false)
      return
    }

    const employee = employees.find((item) => item.id === form.employee_id)

    if (!employee) {
      setErrorMessage('Data karyawan tidak ditemukan.')
      setSaving(false)
      return
    }

    if (!employee.machine_pin) {
      setErrorMessage('Karyawan belum memiliki machine PIN.')
      setSaving(false)
      return
    }

    const attendanceResult = await findAttendanceLog(employee, form.phl_date)

    if (attendanceResult.error) {
      setErrorMessage(attendanceResult.error)
      setSaving(false)
      return
    }

    const attendance = attendanceResult.data
    const proofResult = await uploadProof(selectedFile)

    if (proofResult.error) {
      setErrorMessage(proofResult.error)
      setSaving(false)
      return
    }

    const status = attendance ? 'verified' : 'pending_checklock'
    const reason = getPHLReason(form.phl_date) || 'PHL berdasarkan ST/perintah atasan'

    const { error } = await supabase
      .from('phl_records')
      .upsert(
        {
          employee_id: employee.id,
          employee_number: employee.employee_number || null,
          machine_pin: employee.machine_pin,

          full_name: employee.full_name || null,
          department: employee.department || null,
          position: employee.position || null,

          phl_date: form.phl_date,

          attendance_log_id: attendance?.id || null,
          check_in: attendance?.check_in || null,
          check_out: attendance?.check_out || null,

          source: 'manual_st',
          status,
          reason,

          balance_days: form.balance_days,
          used_days: 0,
          remaining_days: form.balance_days,

          valid_from: form.phl_date,
          expired_at: addDays(form.phl_date, 90),

          proof_file_url: proofResult.url,
          proof_file_name: selectedFile.name,
          proof_file_size: selectedFile.size,
          proof_file_type: proofResult.fileType,

          notes:
            form.notes ||
            (attendance
              ? 'PHL terverifikasi karena terdapat checklock dan bukti ST/perintah atasan.'
              : 'PHL menunggu checklock karena bukti ST/perintah atasan sudah tersedia, tetapi data absensi belum ditemukan.'),

          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'machine_pin,phl_date',
        }
      )

    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }

    setSuccessMessage(
      attendance
        ? 'Data PHL berhasil disimpan dan terverifikasi.'
        : 'Data PHL berhasil disimpan, tetapi masih menunggu checklock.'
    )

    setForm(initialForm)
    setSelectedFile(null)
    setShowForm(false)
    setSaving(false)

    await fetchData()
  }

  async function handleUploadProof(record: PHLRecord, file: File | null) {
    if (!file) return

    setErrorMessage('')
    setSuccessMessage('')

    const fileValidation = validateFile(file)

    if (fileValidation) {
      setErrorMessage(fileValidation)
      return
    }

    const proofResult = await uploadProof(file)

    if (proofResult.error) {
      setErrorMessage(proofResult.error)
      return
    }

    const nextStatus = record.attendance_log_id ? 'verified' : 'pending_checklock'

    const { error } = await supabase
      .from('phl_records')
      .update({
        proof_file_url: proofResult.url,
        proof_file_name: file.name,
        proof_file_size: file.size,
        proof_file_type: proofResult.fileType,
        status: nextStatus,
        notes:
          nextStatus === 'verified'
            ? 'Bukti ST/perintah atasan telah diunggah dan checklock tersedia.'
            : 'Bukti ST/perintah atasan telah diunggah, tetapi checklock belum ditemukan.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSuccessMessage('Bukti PHL berhasil diunggah.')
    await fetchData()
  }

  async function handleVerify(record: PHLRecord) {
    setErrorMessage('')
    setSuccessMessage('')

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('machine_pin', record.machine_pin)
      .eq('attendance_date', record.phl_date)
      .maybeSingle()

    if (error) {
      setErrorMessage(error.message)
      return
    }

    const attendance = data as AttendanceLog | null

    if (!attendance) {
      setErrorMessage('Checklock belum ditemukan pada tanggal PHL tersebut.')
      return
    }

    const nextStatus = record.proof_file_url ? 'verified' : 'pending_proof'

    const { error: updateError } = await supabase
      .from('phl_records')
      .update({
        attendance_log_id: attendance.id,
        check_in: attendance.check_in,
        check_out: attendance.check_out,
        status: nextStatus,
        notes:
          nextStatus === 'verified'
            ? 'PHL terverifikasi karena checklock dan bukti tersedia.'
            : 'Checklock ditemukan. Menunggu bukti ST/perintah atasan.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id)

    if (updateError) {
      setErrorMessage(updateError.message)
      return
    }

    setSuccessMessage('Data PHL berhasil diverifikasi berdasarkan checklock.')
    await fetchData()
  }

  async function handleApprove(record: PHLRecord) {
    setErrorMessage('')
    setSuccessMessage('')

    if (record.status === 'approved') {
      setErrorMessage('Data PHL sudah disetujui sebelumnya.')
      return
    }

    if (!record.proof_file_url) {
      setErrorMessage('PHL belum dapat disetujui karena bukti ST/perintah atasan belum tersedia.')
      return
    }

    if (!record.attendance_log_id) {
      setErrorMessage('PHL belum dapat disetujui karena checklock belum terverifikasi.')
      return
    }

    if (record.status !== 'verified') {
      setErrorMessage('PHL hanya dapat disetujui setelah status Verified.')
      return
    }

    const employee = employees.find((item) => item.id === record.employee_id)

    if (!employee) {
      setErrorMessage('Data karyawan tidak ditemukan.')
      return
    }

    const currentBalance = Number(employee.phl_balance || 0)
    const additionalBalance = Number(record.remaining_days ?? record.balance_days ?? 1)

    const { error: employeeError } = await supabase
      .from('employees')
      .update({
        phl_balance: currentBalance + additionalBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employee.id)

    if (employeeError) {
      setErrorMessage(employeeError.message)
      return
    }

    const { error: recordError } = await supabase
      .from('phl_records')
      .update({
        status: 'approved',
        approved_by: 'HR',
        approved_at: new Date().toISOString(),
        remaining_days: additionalBalance,
        notes:
          record.notes ||
          `PHL disetujui dan saldo berlaku sampai ${record.expired_at}.`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id)

    if (recordError) {
      setErrorMessage(recordError.message)
      return
    }

    setSuccessMessage('PHL berhasil disetujui dan saldo PHL karyawan telah ditambahkan.')
    await fetchData()
  }

  async function handleReject(record: PHLRecord) {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menolak PHL ${record.full_name || record.machine_pin} pada tanggal ${record.phl_date}?`
    )

    if (!confirmed) return

    setErrorMessage('')
    setSuccessMessage('')

    if (record.status === 'approved') {
      setErrorMessage('PHL yang sudah disetujui tidak dapat ditolak melalui tombol ini.')
      return
    }

    const { error } = await supabase
      .from('phl_records')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSuccessMessage('Data PHL berhasil ditolak.')
    await fetchData()
  }

  const filteredApprovalRecords = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return records.filter((record) => {
      const matchesKeyword =
        !keyword ||
        record.full_name?.toLowerCase().includes(keyword) ||
        record.employee_number?.toLowerCase().includes(keyword) ||
        record.machine_pin?.toLowerCase().includes(keyword) ||
        record.department?.toLowerCase().includes(keyword) ||
        record.position?.toLowerCase().includes(keyword) ||
        record.phl_date?.toLowerCase().includes(keyword) ||
        record.reason?.toLowerCase().includes(keyword)

      const matchesStatus =
        statusFilter === 'all' || record.status === statusFilter

      return matchesKeyword && matchesStatus
    })
  }, [records, search, statusFilter])

  const approvedRecords = useMemo(() => {
    return records.filter((record) => record.status === 'approved')
  }, [records])

  const filteredBalanceRecords = useMemo(() => {
    const keyword = balanceSearch.toLowerCase().trim()

    return approvedRecords.filter((record) => {
      const balanceStatus = getBalanceStatus(record)

      const matchesKeyword =
        !keyword ||
        record.full_name?.toLowerCase().includes(keyword) ||
        record.employee_number?.toLowerCase().includes(keyword) ||
        record.machine_pin?.toLowerCase().includes(keyword) ||
        record.department?.toLowerCase().includes(keyword) ||
        record.position?.toLowerCase().includes(keyword) ||
        record.reason?.toLowerCase().includes(keyword) ||
        record.phl_date?.toLowerCase().includes(keyword) ||
        record.expired_at?.toLowerCase().includes(keyword)

      const matchesStatus =
        balanceStatusFilter === 'all' || balanceStatus === balanceStatusFilter

      return matchesKeyword && matchesStatus
    })
  }, [approvedRecords, balanceSearch, balanceStatusFilter])

  const totalRecords = records.length

  const pendingProofCount = records.filter(
    (item) => item.status === 'pending_proof'
  ).length

  const pendingChecklockCount = records.filter(
    (item) => item.status === 'pending_checklock'
  ).length

  const verifiedCount = records.filter(
    (item) => item.status === 'verified'
  ).length

  const approvedCount = records.filter(
    (item) => item.status === 'approved'
  ).length

  const activeBalanceRecords = approvedRecords.filter(
    (record) => getBalanceStatus(record) === 'active'
  )

  const expiredBalanceRecords = approvedRecords.filter(
    (record) => getBalanceStatus(record) === 'expired'
  )

  const usedBalanceRecords = approvedRecords.filter(
    (record) => getBalanceStatus(record) === 'used'
  )

  const totalRemainingDays = activeBalanceRecords.reduce((total, record) => {
    return total + Number(record.remaining_days ?? record.balance_days ?? 0)
  }, 0)

  return (
    <>
      <Topbar
        title="Kontrol PHL"
        description="Kelola kandidat PHL, bukti ST/perintah atasan, approval, dan saldo PHL dalam satu halaman."
      />

      <section className="space-y-6 p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total PHL"
            value={String(totalRecords)}
            description="Kandidat dan pengajuan"
            icon={<CalendarDays size={22} />}
            tone="blue"
          />

          <SummaryCard
            title="Pending"
            value={`${pendingProofCount}/${pendingChecklockCount}`}
            description="Proof / checklock"
            icon={<FileText size={22} />}
            tone="orange"
          />

          <SummaryCard
            title="Verified"
            value={String(verifiedCount)}
            description="Siap approve"
            icon={<ShieldCheck size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Saldo Aktif"
            value={String(totalRemainingDays)}
            description="Hari PHL aktif"
            icon={<WalletCards size={22} />}
            tone="purple"
          />
        </div>

        <div className="harmony-card overflow-hidden p-2">
          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab('approval')}
              className={[
                'flex items-center justify-center gap-2 rounded-[22px] px-5 py-4 text-sm font-bold transition',
                activeTab === 'approval'
                  ? 'bg-[#1d1d1f] text-white shadow-lg'
                  : 'bg-white text-[#6e6e73] hover:bg-[#f5f5f7]',
              ].join(' ')}
            >
              <ShieldCheck size={18} />
              Kandidat & Approval PHL
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('balance')}
              className={[
                'flex items-center justify-center gap-2 rounded-[22px] px-5 py-4 text-sm font-bold transition',
                activeTab === 'balance'
                  ? 'bg-[#1d1d1f] text-white shadow-lg'
                  : 'bg-white text-[#6e6e73] hover:bg-[#f5f5f7]',
              ].join(' ')}
            >
              <WalletCards size={18} />
              Saldo PHL
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            Error: {errorMessage}
          </div>
        )}

        {activeTab === 'approval' && (
          <>
            {showForm && (
              <div className="harmony-card overflow-hidden harmony-fade-in">
                <div className="border-b border-black/5 bg-white/70 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#1d1d1f]">
                        Tambah PHL Manual
                      </h2>

                      <p className="mt-1 text-sm text-[#6e6e73]">
                        Digunakan jika ada ST/perintah atasan lebih dulu. Sistem tetap akan mengecek checklock pada tanggal PHL.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={resetForm}
                      className="harmony-button-secondary"
                    >
                      <X size={18} />
                      Tutup
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 bg-white/40 p-6"
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <label className="block">
                      <span className="harmony-label">Karyawan</span>

                      <select
                        value={form.employee_id}
                        onChange={(event) =>
                          updateForm('employee_id', event.target.value)
                        }
                        className="harmony-select"
                        required
                      >
                        <option value="">Pilih karyawan</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.full_name} · {employee.machine_pin}
                          </option>
                        ))}
                      </select>
                    </label>

                    <InputField
                      label="Tanggal PHL"
                      type="date"
                      value={form.phl_date}
                      onChange={(value) => updateForm('phl_date', value)}
                      required
                    />

                    <InputField
                      label="Jumlah Hari Saldo"
                      type="number"
                      value={String(form.balance_days)}
                      onChange={(value) => updateForm('balance_days', Number(value))}
                      required
                    />

                    <TextAreaField
                      label="Catatan"
                      value={form.notes}
                      onChange={(value) => updateForm('notes', value)}
                      placeholder="Contoh: Berdasarkan ST kegiatan pada hari libur."
                    />
                  </div>

                  <label
                    htmlFor="phl-proof"
                    className={[
                      'group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed p-6 text-center transition',
                      selectedFile
                        ? 'border-[#007aff]/40 bg-[#e8f2ff]/70'
                        : 'border-black/10 bg-white/55 hover:border-[#007aff]/40 hover:bg-white',
                    ].join(' ')}
                  >
                    <input
                      id="phl-proof"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null
                        setSelectedFile(file)
                      }}
                    />

                    <div
                      className={[
                        'mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] transition',
                        selectedFile
                          ? 'bg-[#007aff] text-white'
                          : 'bg-[#e8f2ff] text-[#007aff] group-hover:scale-105',
                      ].join(' ')}
                    >
                      {selectedFile ? <FileText size={28} /> : <Upload size={28} />}
                    </div>

                    <h3 className="text-lg font-semibold text-[#1d1d1f]">
                      {selectedFile ? selectedFile.name : 'Upload Bukti ST / Perintah Atasan'}
                    </h3>

                    <p className="mt-2 max-w-md text-sm leading-6 text-[#6e6e73]">
                      Bukti wajib diunggah sebagai dasar pencatatan PHL. Format PDF, JPG, JPEG, PNG, atau WEBP. Maksimal 10 MB.
                    </p>
                  </label>

                  <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="harmony-button-secondary"
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="harmony-button-primary"
                    >
                      <Save size={18} />
                      {saving ? 'Menyimpan...' : 'Simpan PHL'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="harmony-card overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-black/5 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">
                    Kandidat & Approval PHL
                  </h2>

                  <p className="mt-1 text-sm text-[#6e6e73]">
                    Kandidat otomatis berasal dari checklock pada Sabtu/Minggu atau hari libur aktif. Saldo hanya bertambah setelah bukti tersedia dan HR approve.
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={syncPHLCandidates}
                    disabled={syncing}
                    className="harmony-button-blue"
                  >
                    <RotateCcw size={18} />
                    {syncing ? 'Syncing...' : 'Sync Kandidat'}
                  </button>

                  <button
                    type="button"
                    onClick={fetchData}
                    className="harmony-button-secondary"
                  >
                    <RefreshCcw size={18} />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="harmony-button-primary"
                  >
                    <Plus size={18} />
                    Tambah PHL
                  </button>
                </div>
              </div>

              <div className="grid gap-3 border-b border-black/5 bg-white/35 p-6 xl:grid-cols-[1fr_220px]">
                <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
                  <Search size={18} className="text-[#6e6e73]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama, NIP, machine PIN, unit, alasan PHL..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="harmony-select"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending_proof">Pending Proof</option>
                  <option value="pending_checklock">Pending Checklock</option>
                  <option value="verified">Verified</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {loading && (
                <div className="p-6 text-sm text-[#6e6e73]">
                  Memuat data PHL...
                </div>
              )}

              {!loading && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1450px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                        <th className="w-[22%] px-6 py-4 font-semibold">Employee</th>
                        <th className="w-[10%] px-6 py-4 font-semibold">Machine PIN</th>
                        <th className="w-[10%] px-6 py-4 font-semibold">Tanggal</th>
                        <th className="w-[11%] px-6 py-4 font-semibold">Checklock</th>
                        <th className="w-[18%] px-6 py-4 font-semibold">Alasan PHL</th>
                        <th className="w-[9%] px-6 py-4 font-semibold">Saldo</th>
                        <th className="w-[10%] px-6 py-4 font-semibold">Status</th>
                        <th className="w-[10%] px-6 py-4 text-center font-semibold">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredApprovalRecords.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-black/5 transition hover:bg-white/55"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white">
                                {getInitials(record.full_name || record.machine_pin)}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate font-semibold text-[#1d1d1f]">
                                  {record.full_name || '-'}
                                </div>
                                <div className="mt-1 truncate text-xs text-[#6e6e73]">
                                  {record.employee_number || '-'} · {record.department || '-'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                              <Fingerprint size={13} />
                              {record.machine_pin}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-[#1d1d1f]">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <CalendarDays size={15} className="text-[#007aff]" />
                              {record.phl_date}
                            </div>
                            <div className="mt-1 text-xs text-[#6e6e73]">
                              Exp: {record.expired_at || '-'}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <Clock3 size={14} className="text-[#007aff]" />
                              <div className="text-xs leading-4">
                                <div className="font-bold text-[#1d1d1f]">
                                  In {record.check_in || '-'}
                                </div>
                                <div className="text-[#6e6e73]">
                                  Out {record.check_out || '-'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-medium text-[#1d1d1f]">
                              {record.reason || '-'}
                            </div>
                            <div className="mt-1 text-xs text-[#6e6e73]">
                              {record.source === 'manual_st' ? 'Input Manual' : 'Auto Candidate'}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <WalletCards size={14} className="text-[#007aff]" />
                              <div className="text-xs leading-4">
                                <div className="font-bold text-[#1d1d1f]">
                                  {record.balance_days || 1} hari
                                </div>
                                <div className="text-[#6e6e73]">
                                  PHL
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <PHLStatusBadge status={record.status || 'pending_proof'} />
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {record.proof_file_url ? (
                                <a
                                  href={record.proof_file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Lihat bukti"
                                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/5 bg-white text-[#007aff] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f5f5f7] hover:shadow-md"
                                >
                                  <Download size={16} />
                                </a>
                              ) : (
                                <label
                                  title="Upload bukti"
                                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-black/5 bg-white text-[#007aff] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f5f5f7] hover:shadow-md"
                                >
                                  <Upload size={16} />
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    className="hidden"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0] || null
                                      handleUploadProof(record, file)
                                    }}
                                  />
                                </label>
                              )}

                              <button
                                type="button"
                                title="Verifikasi checklock"
                                onClick={() => handleVerify(record)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#0059b8] transition hover:-translate-y-0.5 hover:bg-blue-100"
                              >
                                <ShieldCheck size={16} />
                              </button>

                              <button
                                type="button"
                                title="Setujui PHL"
                                onClick={() => handleApprove(record)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-700 transition hover:-translate-y-0.5 hover:bg-green-100"
                              >
                                <CheckCircle2 size={16} />
                              </button>

                              <button
                                type="button"
                                title="Tolak PHL"
                                onClick={() => handleReject(record)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100"
                              >
                                <Ban size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredApprovalRecords.length === 0 && (
                    <EmptyState
                      title="Data PHL tidak ditemukan"
                      description="Klik Sync Kandidat untuk membaca checklock pada Sabtu/Minggu atau hari libur aktif."
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'balance' && (
          <div className="harmony-card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-black/5 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1d1d1f]">
                  Saldo PHL
                </h2>

                <p className="mt-1 text-sm text-[#6e6e73]">
                  Menampilkan PHL yang sudah Approved, termasuk sisa hari dan masa berlaku 90 hari kalender.
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

            <div className="grid gap-3 border-b border-black/5 bg-white/35 p-6 xl:grid-cols-[1fr_220px]">
              <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
                <Search size={18} className="text-[#6e6e73]" />
                <input
                  value={balanceSearch}
                  onChange={(event) => setBalanceSearch(event.target.value)}
                  placeholder="Cari nama, PIN, unit, tanggal, expired..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b]"
                />
              </div>

              <select
                value={balanceStatusFilter}
                onChange={(event) => setBalanceStatusFilter(event.target.value)}
                className="harmony-select"
              >
                <option value="all">Semua Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="used">Used</option>
              </select>
            </div>

            {loading && (
              <div className="p-6 text-sm text-[#6e6e73]">
                Memuat saldo PHL...
              </div>
            )}

            {!loading && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1350px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                      <th className="w-[22%] px-6 py-4 font-semibold">Employee</th>
                      <th className="w-[10%] px-6 py-4 font-semibold">Machine PIN</th>
                      <th className="w-[10%] px-6 py-4 font-semibold">Tanggal PHL</th>
                      <th className="w-[12%] px-6 py-4 font-semibold">Checklock</th>
                      <th className="w-[16%] px-6 py-4 font-semibold">Alasan</th>
                      <th className="w-[12%] px-6 py-4 font-semibold">Saldo</th>
                      <th className="w-[10%] px-6 py-4 font-semibold">Expired</th>
                      <th className="w-[8%] px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBalanceRecords.map((record) => {
                      const balanceStatus = getBalanceStatus(record)
                      const daysLeft = getDaysLeft(record.expired_at)

                      return (
                        <tr
                          key={record.id}
                          className="border-b border-black/5 transition hover:bg-white/55"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white">
                                {getInitials(record.full_name || record.machine_pin)}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate font-semibold text-[#1d1d1f]">
                                  {record.full_name || '-'}
                                </div>
                                <div className="mt-1 truncate text-xs text-[#6e6e73]">
                                  {record.employee_number || '-'} · {record.department || '-'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                              <Fingerprint size={13} />
                              {record.machine_pin}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-[#1d1d1f]">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <CalendarDays size={15} className="text-[#007aff]" />
                              {record.phl_date}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <Clock3 size={14} className="text-[#007aff]" />
                              <div className="text-xs leading-4">
                                <div className="font-bold text-[#1d1d1f]">
                                  In {record.check_in || '-'}
                                </div>
                                <div className="text-[#6e6e73]">
                                  Out {record.check_out || '-'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="line-clamp-2 font-medium text-[#1d1d1f]">
                              {record.reason || '-'}
                            </div>

                            {record.proof_file_url && (
                              <a
                                href={record.proof_file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#007aff]"
                              >
                                <Download size={13} />
                                Lihat bukti
                              </a>
                            )}

                            {!record.proof_file_url && (
                              <div className="mt-2 inline-flex items-center gap-1 text-xs text-[#6e6e73]">
                                <FileText size={13} />
                                Tidak ada bukti
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <WalletCards size={14} className="text-[#007aff]" />
                              <div className="text-xs leading-4">
                                <div className="font-bold text-[#1d1d1f]">
                                  Sisa {Number(record.remaining_days ?? record.balance_days ?? 0)} hari
                                </div>
                                <div className="text-[#6e6e73]">
                                  Total {Number(record.balance_days || 1)} · Pakai {Number(record.used_days || 0)}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-start gap-2">
                              <TimerReset
                                size={15}
                                className="mt-0.5 shrink-0 text-[#007aff]"
                              />

                              <div>
                                <div className="font-medium text-[#1d1d1f]">
                                  {record.expired_at || '-'}
                                </div>
                                <div className="mt-1 text-xs text-[#6e6e73]">
                                  {daysLeft === null
                                    ? '-'
                                    : daysLeft < 0
                                      ? `Lewat ${Math.abs(daysLeft)} hari`
                                      : `${daysLeft} hari lagi`}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <BalanceStatusBadge status={balanceStatus} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {filteredBalanceRecords.length === 0 && (
                  <EmptyState
                    title="Saldo PHL tidak ditemukan"
                    description="Saldo akan muncul setelah PHL berstatus Approved."
                  />
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </>
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
    <div className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
        <WalletCards size={24} />
      </div>

      <h3 className="mt-4 font-semibold text-[#1d1d1f]">
        {title}
      </h3>

      <p className="mt-1 text-sm text-[#6e6e73]">
        {description}
      </p>
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
        <div>
          <p className="text-sm text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 truncate text-3xl font-semibold tracking-tight text-[#1d1d1f]">
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

type InputFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: InputFieldProps) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="harmony-input"
      />
    </label>
  )
}

type TextAreaFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <label className="block xl:col-span-3">
      <span className="harmony-label">
        {label}
      </span>

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="harmony-textarea"
      />
    </label>
  )
}

function PHLStatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'approved'
      ? 'bg-green-50 text-green-700'
      : status === 'verified'
        ? 'bg-[#e8f2ff] text-[#0059b8]'
        : status === 'rejected'
          ? 'bg-red-50 text-red-700'
          : 'bg-orange-50 text-orange-700'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {formatPHLStatus(status)}
    </span>
  )
}

function BalanceStatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'active'
      ? 'bg-green-50 text-green-700'
      : status === 'expired'
        ? 'bg-red-50 text-red-700'
        : 'bg-orange-50 text-orange-700'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${className}`}>
      {status}
    </span>
  )
}

function formatPHLStatus(status: string) {
  if (status === 'pending_proof') return 'Pending Proof'
  if (status === 'pending_checklock') return 'Pending Checklock'
  if (status === 'verified') return 'Verified'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'

  return status
}

function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)

  if (words.length === 0) return 'P'

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}