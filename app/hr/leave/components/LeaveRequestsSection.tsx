'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  Plus,
  Pencil,
  Save,
  X,
  RefreshCcw,
  Upload,
  FileText,
  ExternalLink,
  Eye,
  Trash2,
  ShieldCheck,
  CalendarDays,
  UserRound,
  Building2,
  MessageSquareText,
  WalletCards,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/employee'
import type { RequestRecord } from '@/types/request'
import type { LeaveType } from '@/types/leaveType'

type RequestForm = {
  employee_number: string
  full_name: string
  department: string

  request_type: string
  start_date: string
  end_date: string
  total_days: number

  reason: string

  attachment_url: string
  attachment_name: string
  attachment_required: boolean
  attachment_label: string

  balance_source: string
  is_paid: boolean

  approval_status: string

  supervisor_1: string
  supervisor_1_status: string
  supervisor_1_notes: string

  supervisor_2: string
  supervisor_2_status: string
  supervisor_2_notes: string

  hr_status: string
  hr_notes: string

  is_active: boolean
}

const initialForm: RequestForm = {
  employee_number: '',
  full_name: '',
  department: '',

  request_type: 'annual_leave',
  start_date: '',
  end_date: '',
  total_days: 1,

  reason: '',

  attachment_url: '',
  attachment_name: '',
  attachment_required: false,
  attachment_label: '',

  balance_source: 'annual_leave',
  is_paid: true,

  approval_status: 'pending',

  supervisor_1: '',
  supervisor_1_status: 'pending',
  supervisor_1_notes: '',

  supervisor_2: '',
  supervisor_2_status: 'pending',
  supervisor_2_notes: '',

  hr_status: 'pending',
  hr_notes: '',

  is_active: true,
}

const approvalOptions = [
  {
    label: 'Pending',
    value: 'pending',
  },
  {
    label: 'Approved',
    value: 'approved',
  },
  {
    label: 'Rejected',
    value: 'rejected',
  },
]

export function LeaveRequestsSection() {
  const [requests, setRequests] = useState<RequestRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)

  const [detailRequest, setDetailRequest] = useState<RequestRecord | null>(null)
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<RequestForm>(initialForm)

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (requestError) {
      setErrorMessage(requestError.message)
      setRequests([])
      setLoading(false)
      return
    }

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

    const { data: leaveTypeData, error: leaveTypeError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (leaveTypeError) {
      setErrorMessage(leaveTypeError.message)
      setLeaveTypes([])
      setLoading(false)
      return
    }

    setRequests(requestData || [])
    setEmployees(employeeData || [])
    setLeaveTypes(leaveTypeData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function updateForm(
    field: keyof RequestForm,
    value: string | number | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingRequestId(null)
    setShowForm(false)
    setSelectedAttachmentFile(null)
    setErrorMessage('')
  }

  function getSelectedLeaveType(code = form.request_type) {
    return leaveTypes.find((item) => item.code === code)
  }

  function getLeaveTypeName(code: string | null) {
    const leaveType = leaveTypes.find((item) => item.code === code)
    return leaveType?.name || code || '-'
  }

  function handleAddNew() {
    const defaultLeaveType =
      leaveTypes.find((item) => item.code === 'annual_leave') ||
      leaveTypes[0]

    setForm({
      ...initialForm,
      request_type: defaultLeaveType?.code || 'annual_leave',
      total_days:
        defaultLeaveType?.default_days && defaultLeaveType.default_days > 0
          ? Number(defaultLeaveType.default_days)
          : 1,
      attachment_required: defaultLeaveType?.requires_attachment || false,
      attachment_label: defaultLeaveType?.attachment_label || '',
      balance_source: defaultLeaveType?.balance_source || 'none',
      is_paid: defaultLeaveType?.is_paid ?? true,
    })

    setEditingRequestId(null)
    setSelectedAttachmentFile(null)
    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')
  }

  function calculateTotalDays(startDate: string, endDate: string) {
    if (!startDate || !endDate) return 1

    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 1
    }

    const diff = end.getTime() - start.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1

    return Math.max(days, 1)
  }

  function handleDateChange(field: 'start_date' | 'end_date', value: string) {
    const nextForm = {
      ...form,
      [field]: value,
    }

    const selectedLeaveType = getSelectedLeaveType(nextForm.request_type)

    const totalDays =
      selectedLeaveType?.default_days && selectedLeaveType.default_days > 0
        ? Number(selectedLeaveType.default_days)
        : calculateTotalDays(nextForm.start_date, nextForm.end_date)

    setForm({
      ...nextForm,
      total_days: totalDays,
    })
  }

  function handleEmployeeSelect(employeeNumber: string) {
    const employee = employees.find(
      (item) => item.employee_number === employeeNumber
    )

    if (!employee) {
      updateForm('employee_number', employeeNumber)
      return
    }

    setForm((prev) => ({
      ...prev,
      employee_number: employee.employee_number || '',
      full_name: employee.full_name || '',
      department: employee.department || '',
      supervisor_1: employee.supervisor_1 || '',
      supervisor_2: employee.supervisor_2 || '',
    }))
  }

  function handleLeaveTypeChange(code: string) {
    const selectedType = getSelectedLeaveType(code)

    setSelectedAttachmentFile(null)

    setForm((prev) => ({
      ...prev,
      request_type: code,
      total_days:
        selectedType?.default_days && selectedType.default_days > 0
          ? Number(selectedType.default_days)
          : calculateTotalDays(prev.start_date, prev.end_date),
      attachment_required: selectedType?.requires_attachment || false,
      attachment_label: selectedType?.attachment_label || '',
      balance_source: selectedType?.balance_source || 'none',
      is_paid: selectedType?.is_paid ?? true,
      attachment_url: '',
      attachment_name: '',
    }))
  }

  function handleEdit(request: RequestRecord) {
    setEditingRequestId(request.id)

    setForm({
      employee_number: request.employee_number || '',
      full_name: request.full_name || '',
      department: request.department || '',

      request_type: request.request_type || 'annual_leave',
      start_date: request.start_date || '',
      end_date: request.end_date || '',
      total_days: Number(request.total_days || 1),

      reason: request.reason || '',

      attachment_url: request.attachment_url || '',
      attachment_name: request.attachment_name || '',
      attachment_required: request.attachment_required || false,
      attachment_label: request.attachment_label || '',

      balance_source: request.balance_source || 'none',
      is_paid: request.is_paid ?? true,

      approval_status: request.approval_status || 'pending',

      supervisor_1: request.supervisor_1 || '',
      supervisor_1_status: request.supervisor_1_status || 'pending',
      supervisor_1_notes: request.supervisor_1_notes || '',

      supervisor_2: request.supervisor_2 || '',
      supervisor_2_status: request.supervisor_2_status || 'pending',
      supervisor_2_notes: request.supervisor_2_notes || '',

      hr_status: request.hr_status || 'pending',
      hr_notes: request.hr_notes || '',

      is_active: request.is_active ?? true,
    })

    setSelectedAttachmentFile(null)
    setShowForm(true)
    setDetailRequest(null)
    setSuccessMessage('')
    setErrorMessage('')
  }

  function findEmployeeByNumber(employeeNumber: string | null) {
    if (!employeeNumber) return null

    return employees.find(
      (employee) => employee.employee_number === employeeNumber
    )
  }

  function isBalanceBasedRequest(balanceSource: string | null) {
    return balanceSource === 'annual_leave' || balanceSource === 'phl'
  }

  async function reduceEmployeeBalance(
    employeeNumber: string | null,
    balanceSource: string | null,
    totalDays: number
  ) {
    const employee = findEmployeeByNumber(employeeNumber)

    if (!employee) {
      return {
        error: 'Employee tidak ditemukan saat update saldo.',
      }
    }

    if (balanceSource === 'annual_leave') {
      const currentBalance = Number(employee.annual_leave_balance || 0)

      if (currentBalance < totalDays) {
        return {
          error: `Saldo cuti tahunan tidak cukup. Sisa saldo: ${currentBalance}.`,
        }
      }

      const { error } = await supabase
        .from('employees')
        .update({
          annual_leave_balance: currentBalance - totalDays,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id)

      return {
        error: error?.message || null,
      }
    }

    if (balanceSource === 'phl') {
      const currentBalance = Number(employee.phl_balance || 0)

      if (currentBalance < totalDays) {
        return {
          error: `Saldo PHL tidak cukup. Sisa saldo: ${currentBalance}.`,
        }
      }

      const { error } = await supabase
        .from('employees')
        .update({
          phl_balance: currentBalance - totalDays,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id)

      return {
        error: error?.message || null,
      }
    }

    return {
      error: null,
    }
  }

  async function returnEmployeeBalance(
    employeeNumber: string | null,
    balanceSource: string | null,
    totalDays: number
  ) {
    const employee = findEmployeeByNumber(employeeNumber)

    if (!employee) {
      return {
        error: 'Employee tidak ditemukan saat mengembalikan saldo.',
      }
    }

    if (balanceSource === 'annual_leave') {
      const currentBalance = Number(employee.annual_leave_balance || 0)

      const { error } = await supabase
        .from('employees')
        .update({
          annual_leave_balance: currentBalance + totalDays,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id)

      return {
        error: error?.message || null,
      }
    }

    if (balanceSource === 'phl') {
      const currentBalance = Number(employee.phl_balance || 0)

      const { error } = await supabase
        .from('employees')
        .update({
          phl_balance: currentBalance + totalDays,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id)

      return {
        error: error?.message || null,
      }
    }

    return {
      error: null,
    }
  }

  async function uploadAttachment() {
    if (!selectedAttachmentFile) {
      return {
        url: '',
        name: '',
        error: null,
      }
    }

    const fileExt = selectedAttachmentFile.name.split('.').pop()
    const cleanFileName = selectedAttachmentFile.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.-]/g, '')

    const fileName = `${Date.now()}-${cleanFileName || `attachment.${fileExt}`}`
    const filePath = `leave-requests/${fileName}`

    const { error } = await supabase.storage
      .from('leave-attachments')
      .upload(filePath, selectedAttachmentFile)

    if (error) {
      return {
        url: '',
        name: '',
        error: error.message,
      }
    }

    const { data } = supabase.storage
      .from('leave-attachments')
      .getPublicUrl(filePath)

    return {
      url: data.publicUrl,
      name: selectedAttachmentFile.name,
      error: null,
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    const selectedLeaveType = getSelectedLeaveType()

    if (!form.employee_number || !form.full_name) {
      setErrorMessage('Employee wajib dipilih.')
      setSaving(false)
      return
    }

    if (!form.start_date || !form.end_date) {
      setErrorMessage('Tanggal mulai dan selesai wajib diisi.')
      setSaving(false)
      return
    }

    const attachmentRequired =
      selectedLeaveType?.requires_attachment || form.attachment_required

    const hasExistingAttachment = Boolean(form.attachment_url)
    const hasNewAttachment = Boolean(selectedAttachmentFile)

    if (attachmentRequired && !hasExistingAttachment && !hasNewAttachment) {
      setErrorMessage(
        `${selectedLeaveType?.attachment_label || 'Bukti pendukung'} wajib diunggah.`
      )
      setSaving(false)
      return
    }

    const attachmentResult = await uploadAttachment()

    if (attachmentResult.error) {
      setErrorMessage(attachmentResult.error)
      setSaving(false)
      return
    }

    const payload = {
      employee_number: form.employee_number,
      full_name: form.full_name,
      department: form.department || null,

      request_type: form.request_type,
      start_date: form.start_date,
      end_date: form.end_date,
      total_days: form.total_days,

      reason: form.reason || null,

      attachment_url: attachmentResult.url || form.attachment_url || null,
      attachment_name: attachmentResult.name || form.attachment_name || null,
      attachment_required: attachmentRequired,
      attachment_label:
        selectedLeaveType?.attachment_label || form.attachment_label || null,

      balance_source:
        selectedLeaveType?.balance_source || form.balance_source || 'none',
      is_paid: selectedLeaveType?.is_paid ?? form.is_paid,

      approval_status: form.approval_status,

      supervisor_1: form.supervisor_1 || null,
      supervisor_1_status: form.supervisor_1_status,
      supervisor_1_notes: form.supervisor_1_notes || null,

      supervisor_2: form.supervisor_2 || null,
      supervisor_2_status: form.supervisor_2_status,
      supervisor_2_notes: form.supervisor_2_notes || null,

      hr_status: form.hr_status,
      hr_notes: form.hr_notes || null,

      is_active: form.is_active,
      edited_by: 'HR',
      updated_at: new Date().toISOString(),
    }

    if (editingRequestId) {
      const { error } = await supabase
        .from('requests')
        .update(payload)
        .eq('id', editingRequestId)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Pengajuan cuti/izin berhasil diperbarui.')
    } else {
      const { error } = await supabase
        .from('requests')
        .insert(payload)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Pengajuan cuti/izin berhasil ditambahkan.')
    }

    setForm(initialForm)
    setEditingRequestId(null)
    setShowForm(false)
    setSelectedAttachmentFile(null)
    setSaving(false)

    await fetchData()
  }

  async function handleApprove(request: RequestRecord) {
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (request.approval_status === 'approved') {
      setErrorMessage('Pengajuan ini sudah approved.')
      setSaving(false)
      return
    }

    if (isBalanceBasedRequest(request.balance_source)) {
      const result = await reduceEmployeeBalance(
        request.employee_number,
        request.balance_source,
        Number(request.total_days || 0)
      )

      if (result.error) {
        setErrorMessage(result.error)
        setSaving(false)
        return
      }
    }

    const { error } = await supabase
      .from('requests')
      .update({
        approval_status: 'approved',
        supervisor_1_status:
          request.supervisor_1_status === 'pending'
            ? 'approved'
            : request.supervisor_1_status,
        supervisor_2_status:
          request.supervisor_2
            ? request.supervisor_2_status === 'pending'
              ? 'approved'
              : request.supervisor_2_status
            : request.supervisor_2_status,
        hr_status: 'approved',
        edited_by: 'HR',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)

    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }

    setSuccessMessage('Pengajuan berhasil disetujui dan saldo telah diperbarui.')
    setSaving(false)
    setDetailRequest(null)
    await fetchData()
  }

  async function handleReject(request: RequestRecord) {
    const confirmed = window.confirm(
      `Tolak pengajuan ${request.full_name || '-'} pada tanggal ${request.start_date || '-'}?`
    )

    if (!confirmed) return

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (
      request.approval_status === 'approved' &&
      isBalanceBasedRequest(request.balance_source)
    ) {
      const result = await returnEmployeeBalance(
        request.employee_number,
        request.balance_source,
        Number(request.total_days || 0)
      )

      if (result.error) {
        setErrorMessage(result.error)
        setSaving(false)
        return
      }
    }

    const { error } = await supabase
      .from('requests')
      .update({
        approval_status: 'rejected',
        hr_status: 'rejected',
        edited_by: 'HR',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)

    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }

    setSuccessMessage('Pengajuan berhasil ditolak.')
    setSaving(false)
    setDetailRequest(null)
    await fetchData()
  }

  async function handleDelete(request: RequestRecord) {
    const confirmed = window.confirm(
      `Hapus pengajuan ${request.full_name || '-'}? Data ini akan dihapus dari tabel requests.`
    )

    if (!confirmed) return

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (
      request.approval_status === 'approved' &&
      isBalanceBasedRequest(request.balance_source)
    ) {
      const result = await returnEmployeeBalance(
        request.employee_number,
        request.balance_source,
        Number(request.total_days || 0)
      )

      if (result.error) {
        setErrorMessage(result.error)
        setSaving(false)
        return
      }
    }

    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', request.id)

    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }

    setSuccessMessage('Pengajuan berhasil dihapus.')
    setSaving(false)
    setDetailRequest(null)
    await fetchData()
  }

  const filteredRequests = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return requests.filter((request) => {
      const matchesKeyword =
        !keyword ||
        request.full_name?.toLowerCase().includes(keyword) ||
        request.employee_number?.toLowerCase().includes(keyword) ||
        request.department?.toLowerCase().includes(keyword) ||
        request.request_type?.toLowerCase().includes(keyword) ||
        request.reason?.toLowerCase().includes(keyword)

      const matchesStatus =
        statusFilter === 'all' || request.approval_status === statusFilter

      const matchesType =
        typeFilter === 'all' || request.request_type === typeFilter

      return matchesKeyword && matchesStatus && matchesType
    })
  }, [requests, search, statusFilter, typeFilter])

  const totalRequests = requests.length
  const pendingRequests = requests.filter(
    (item) => item.approval_status === 'pending'
  ).length
  const approvedRequests = requests.filter(
    (item) => item.approval_status === 'approved'
  ).length
  const rejectedRequests = requests.filter(
    (item) => item.approval_status === 'rejected'
  ).length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total"
          value={String(totalRequests)}
          description="Seluruh pengajuan"
          icon={<FileText size={20} />}
          tone="blue"
        />

        <SummaryCard
          title="Pending"
          value={String(pendingRequests)}
          description="Menunggu approval"
          icon={<Clock3 size={20} />}
          tone="orange"
        />

        <SummaryCard
          title="Approved"
          value={String(approvedRequests)}
          description="Sudah disetujui"
          icon={<CheckCircle2 size={20} />}
          tone="green"
        />

        <SummaryCard
          title="Rejected"
          value={String(rejectedRequests)}
          description="Ditolak"
          icon={<XCircle size={20} />}
          tone="red"
        />
      </div>

      {successMessage && (
        <AlertBox
          type="success"
          message={successMessage}
        />
      )}

      {errorMessage && (
        <AlertBox
          type="error"
          message={`Error: ${errorMessage}`}
        />
      )}

      {showForm && (
        <RequestFormModal
          editingRequestId={editingRequestId}
          form={form}
          employees={employees}
          leaveTypes={leaveTypes}
          selectedAttachmentFile={selectedAttachmentFile}
          saving={saving}
          approvalOptions={approvalOptions}
          onClose={resetForm}
          onSubmit={handleSubmit}
          onEmployeeSelect={handleEmployeeSelect}
          onLeaveTypeChange={handleLeaveTypeChange}
          onDateChange={handleDateChange}
          onUpdateForm={updateForm}
          onFileChange={setSelectedAttachmentFile}
        />
      )}

      {detailRequest && (
        <RequestDetailModal
          request={detailRequest}
          leaveTypeName={getLeaveTypeName(detailRequest.request_type)}
          onClose={() => setDetailRequest(null)}
          onApprove={() => handleApprove(detailRequest)}
          onReject={() => handleReject(detailRequest)}
          onEdit={() => handleEdit(detailRequest)}
          onDelete={() => handleDelete(detailRequest)}
        />
      )}

      <div className="harmony-card harmony-slide-up overflow-hidden">
        <div className="relative overflow-hidden border-b border-black/5 bg-white/55 p-5">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#007aff]/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
                <FileText size={14} />
                Request Record
              </div>

              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Pengajuan Cuti & Izin
              </h2>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Tampilan utama dibuat compact. Informasi lengkap tersedia pada tombol Detail.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
                Tambah
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-black/5 bg-white/35 p-5 xl:grid-cols-[1fr_220px_220px]">
          <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
            <Search size={18} className="text-[#6e6e73]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari employee, NIP, unit, jenis, reason..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="harmony-select"
          >
            <option value="all">Semua Jenis</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.code}>
                {type.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="harmony-select"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading && (
          <div className="p-6 text-sm text-[#6e6e73]">
            Memuat data pengajuan...
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                  <th className="w-[26%] px-5 py-4 font-semibold">Employee</th>
                  <th className="w-[14%] px-5 py-4 font-semibold">Jenis</th>
                  <th className="w-[15%] px-5 py-4 font-semibold">Tanggal</th>
                  <th className="w-[8%] px-5 py-4 text-center font-semibold">Hari</th>
                  <th className="w-[11%] px-5 py-4 font-semibold">Atasan 1</th>
                  <th className="w-[11%] px-5 py-4 font-semibold">Atasan 2</th>
                  <th className="w-[8%] px-5 py-4 font-semibold">Status</th>
                  <th className="w-[7%] px-5 py-4 text-center font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-black/5 transition hover:bg-white/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white shadow-sm">
                          {getInitials(request.full_name || '-')}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-semibold text-[#1d1d1f]">
                            {request.full_name || '-'}
                          </div>

                          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[#6e6e73]">
                            <Building2 size={12} className="shrink-0 text-[#007aff]" />
                            <span className="truncate">
                              {request.employee_number || '-'} · {request.department || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#1d1d1f]">
                        {getLeaveTypeName(request.request_type)}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6e6e73]">
                        <WalletCards size={12} className="text-[#007aff]" />
                        <span>{formatBalanceSource(request.balance_source)}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs leading-5">
                      <div className="font-semibold text-[#1d1d1f]">
                        {formatDisplayDate(request.start_date)}
                      </div>
                      <div className="text-[#6e6e73]">
                        s.d. {formatDisplayDate(request.end_date)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex min-w-10 justify-center rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                        {request.total_days || 0}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <ApprovalMini
                        name={request.supervisor_1 || '-'}
                        status={request.supervisor_1_status || 'pending'}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <ApprovalMini
                        name={request.supervisor_2 || '-'}
                        status={request.supervisor_2_status || 'pending'}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={request.approval_status || 'pending'} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <ActionButton
                          title="Detail"
                          icon={<Eye size={15} />}
                          tone="blue"
                          onClick={() => setDetailRequest(request)}
                        />

                        <ActionButton
                          title="Edit"
                          icon={<Pencil size={15} />}
                          tone="neutral"
                          onClick={() => handleEdit(request)}
                        />

                        <ActionButton
                          title="Hapus"
                          icon={<Trash2 size={15} />}
                          tone="red"
                          onClick={() => handleDelete(request)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRequests.length === 0 && (
              <EmptyState
                title="Data pengajuan tidak ditemukan"
                description="Coba ubah filter pencarian atau tambahkan pengajuan baru."
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RequestFormModal({
  editingRequestId,
  form,
  employees,
  leaveTypes,
  selectedAttachmentFile,
  saving,
  approvalOptions,
  onClose,
  onSubmit,
  onEmployeeSelect,
  onLeaveTypeChange,
  onDateChange,
  onUpdateForm,
  onFileChange,
}: {
  editingRequestId: string | null
  form: RequestForm
  employees: Employee[]
  leaveTypes: LeaveType[]
  selectedAttachmentFile: File | null
  saving: boolean
  approvalOptions: {
    label: string
    value: string
  }[]
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onEmployeeSelect: (employeeNumber: string) => void
  onLeaveTypeChange: (code: string) => void
  onDateChange: (field: 'start_date' | 'end_date', value: string) => void
  onUpdateForm: (field: keyof RequestForm, value: string | number | boolean) => void
  onFileChange: (file: File | null) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/20 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
        <div className="relative overflow-hidden border-b border-white/10 bg-[#1d1d1f] p-6 text-white">
          <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-[#007aff]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-20 h-60 w-60 rounded-full bg-[#af52de]/25 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75">
                <FileText size={14} />
                Leave Request Form
              </div>

              <h2 className="text-2xl font-semibold tracking-tight">
                {editingRequestId ? 'Edit Pengajuan' : 'Tambah Pengajuan'}
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                Input dibuat dalam modal agar halaman utama tetap clean. Lengkapi data employee,
                tanggal, approval, reason, dan bukti pendukung.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/15"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#f5f5f7]/60 p-5">
            <FormPanel
              icon={<UserRound size={18} />}
              tone="blue"
              title="Data Employee & Jenis Pengajuan"
              description="Pilih employee, jenis cuti/izin, tanggal, dan jumlah hari."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="block xl:col-span-2">
                  <span className="harmony-label">Employee</span>
                  <select
                    value={form.employee_number}
                    onChange={(event) => onEmployeeSelect(event.target.value)}
                    className="harmony-select"
                    required
                  >
                    <option value="">Pilih employee</option>
                    {employees.map((employee) => (
                      <option
                        key={employee.id}
                        value={employee.employee_number}
                      >
                        {employee.full_name} · {employee.employee_number}
                      </option>
                    ))}
                  </select>
                </label>

                <InputField
                  label="Nama"
                  value={form.full_name}
                  onChange={(value) => onUpdateForm('full_name', value)}
                  required
                />

                <InputField
                  label="Department"
                  value={form.department}
                  onChange={(value) => onUpdateForm('department', value)}
                />

                <label className="block xl:col-span-2">
                  <span className="harmony-label">Jenis Pengajuan</span>
                  <select
                    value={form.request_type}
                    onChange={(event) => onLeaveTypeChange(event.target.value)}
                    className="harmony-select"
                  >
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>

                <InputField
                  label="Tanggal Mulai"
                  type="date"
                  value={form.start_date}
                  onChange={(value) => onDateChange('start_date', value)}
                  required
                />

                <InputField
                  label="Tanggal Selesai"
                  type="date"
                  value={form.end_date}
                  onChange={(value) => onDateChange('end_date', value)}
                  required
                />

                <InputField
                  label="Total Hari"
                  type="number"
                  value={String(form.total_days)}
                  onChange={(value) => onUpdateForm('total_days', Number(value))}
                  required
                />
              </div>
            </FormPanel>

            <FormPanel
              icon={<ShieldCheck size={18} />}
              tone="purple"
              title="Approval"
              description="Status atasan dan HR dapat disesuaikan oleh HR administrator."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InputField
                  label="Atasan 1"
                  value={form.supervisor_1}
                  onChange={(value) => onUpdateForm('supervisor_1', value)}
                />

                <InputField
                  label="Atasan 2"
                  value={form.supervisor_2}
                  onChange={(value) => onUpdateForm('supervisor_2', value)}
                />

                <SelectField
                  label="Status Final"
                  value={form.approval_status}
                  onChange={(value) => onUpdateForm('approval_status', value)}
                  options={approvalOptions}
                />

                <SelectField
                  label="Status Atasan 1"
                  value={form.supervisor_1_status}
                  onChange={(value) => onUpdateForm('supervisor_1_status', value)}
                  options={approvalOptions}
                />

                <SelectField
                  label="Status Atasan 2"
                  value={form.supervisor_2_status}
                  onChange={(value) => onUpdateForm('supervisor_2_status', value)}
                  options={approvalOptions}
                />

                <SelectField
                  label="Status HR"
                  value={form.hr_status}
                  onChange={(value) => onUpdateForm('hr_status', value)}
                  options={approvalOptions}
                />
              </div>
            </FormPanel>

            <FormPanel
              icon={<MessageSquareText size={18} />}
              tone="orange"
              title="Reason & Bukti"
              description="Lengkapi alasan pengajuan dan dokumen pendukung jika diperlukan."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <TextAreaField
                  label="Reason"
                  value={form.reason}
                  onChange={(value) => onUpdateForm('reason', value)}
                  placeholder="Alasan pengajuan."
                />

                <TextAreaField
                  label="Catatan HR"
                  value={form.hr_notes}
                  onChange={(value) => onUpdateForm('hr_notes', value)}
                  placeholder="Catatan HR jika diperlukan."
                />
              </div>

              <label
                htmlFor="leave-attachment"
                className={[
                  'group mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed p-6 text-center transition',
                  selectedAttachmentFile || form.attachment_url
                    ? 'border-[#007aff]/40 bg-[#e8f2ff]/70'
                    : 'border-black/10 bg-white/60 hover:border-[#007aff]/40 hover:bg-white',
                ].join(' ')}
              >
                <input
                  id="leave-attachment"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    onFileChange(file)
                  }}
                />

                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#e8f2ff] text-[#007aff] transition group-hover:scale-105">
                  <Upload size={24} />
                </div>

                <h3 className="text-base font-semibold text-[#1d1d1f]">
                  {selectedAttachmentFile
                    ? selectedAttachmentFile.name
                    : form.attachment_name || 'Upload Bukti Pendukung'}
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-[#6e6e73]">
                  {form.attachment_required
                    ? `${form.attachment_label || 'Bukti pendukung'} wajib diunggah.`
                    : 'Upload bukti bersifat opsional untuk jenis pengajuan ini.'}
                </p>
              </label>
            </FormPanel>
          </div>

          <div className="grid gap-3 border-t border-black/5 bg-white/90 p-5 md:grid-cols-[1fr_180px_180px]">
            <div className="hidden items-center rounded-2xl bg-[#f5f5f7] px-4 text-sm text-[#6e6e73] md:flex">
              Pastikan data tanggal, total hari, dan bukti pendukung sudah benar sebelum menyimpan.
            </div>

            <button
              type="button"
              onClick={onClose}
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
              {saving ? 'Menyimpan...' : editingRequestId ? 'Update Data' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RequestDetailModal({
  request,
  leaveTypeName,
  onClose,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: {
  request: RequestRecord
  leaveTypeName: string
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[34px] border border-white/20 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="relative overflow-hidden border-b border-black/5 bg-[#1d1d1f] p-6 text-white">
          <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-[#007aff]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-20 h-60 w-60 rounded-full bg-[#af52de]/25 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75">
                <Eye size={14} />
                Detail Pengajuan
              </div>

              <h2 className="text-2xl font-semibold tracking-tight">
                {request.full_name || '-'}
              </h2>

              <p className="mt-2 text-sm text-white/60">
                {leaveTypeName} · {formatDisplayDate(request.start_date)} s.d. {formatDisplayDate(request.end_date)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/15"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard
              label="Employee"
              value={request.full_name || '-'}
              subValue={`${request.employee_number || '-'} · ${request.department || '-'}`}
              icon={<UserRound size={18} />}
              tone="blue"
            />

            <DetailCard
              label="Jenis Pengajuan"
              value={leaveTypeName}
              subValue={formatBalanceSource(request.balance_source)}
              icon={<FileText size={18} />}
              tone="purple"
            />

            <DetailCard
              label="Tanggal"
              value={`${formatDisplayDate(request.start_date)} - ${formatDisplayDate(request.end_date)}`}
              subValue={`${request.total_days || 0} hari`}
              icon={<CalendarDays size={18} />}
              tone="orange"
            />

            <DetailCard
              label="Atasan 1"
              value={request.supervisor_1 || '-'}
              subValue={formatStatusText(request.supervisor_1_status || 'pending')}
              icon={<ShieldCheck size={18} />}
              tone="green"
            />

            <DetailCard
              label="Atasan 2"
              value={request.supervisor_2 || '-'}
              subValue={formatStatusText(request.supervisor_2_status || 'pending')}
              icon={<ShieldCheck size={18} />}
              tone="green"
            />

            <DetailCard
              label="HR Status"
              value={formatStatusText(request.hr_status || 'pending')}
              subValue={`Final: ${formatStatusText(request.approval_status || 'pending')}`}
              icon={<ShieldCheck size={18} />}
              tone="blue"
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <InfoPanel
              title="Reason"
              icon={<MessageSquareText size={18} />}
              content={request.reason || '-'}
            />

            <InfoPanel
              title="Catatan HR"
              icon={<MessageSquareText size={18} />}
              content={request.hr_notes || '-'}
            />
          </div>

          <div className="mt-5 rounded-[28px] border border-black/5 bg-white/80 p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-[#1d1d1f]">
                  Bukti Pendukung
                </h3>
                <p className="mt-1 text-sm text-[#6e6e73]">
                  {request.attachment_label || 'Dokumen pendukung pengajuan.'}
                </p>
              </div>

              {request.attachment_url ? (
                <a
                  href={request.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-[#007aff] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,122,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0067d8]"
                >
                  <ExternalLink size={16} />
                  Buka Bukti
                </a>
              ) : (
                <span className="inline-flex rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#6e6e73]">
                  Tidak ada bukti
                </span>
              )}
            </div>

            <div className="rounded-2xl bg-[#f5f5f7]/80 p-4 text-sm text-[#6e6e73]">
              {request.attachment_name || 'Belum ada file yang terunggah.'}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-black/5 bg-white/70 p-5 md:grid-cols-5">
          <button
            type="button"
            onClick={onClose}
            className="harmony-button-secondary"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={onApprove}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-green-600 px-5 text-sm font-bold text-white transition hover:bg-green-700"
          >
            <CheckCircle2 size={18} />
            Approve
          </button>

          <button
            type="button"
            onClick={onReject}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <XCircle size={18} />
            Reject
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="harmony-button-secondary"
          >
            <Pencil size={18} />
            Edit
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 size={18} />
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

function FormPanel({
  title,
  description,
  icon,
  tone,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  tone: 'blue' | 'purple' | 'orange'
  children: React.ReactNode
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
  }[tone]

  return (
    <div className="rounded-[28px] border border-black/5 bg-white/80 p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className={`rounded-2xl p-3 ${toneClass}`}>
          {icon}
        </div>

        <div>
          <h3 className="font-semibold text-[#1d1d1f]">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
            {description}
          </p>
        </div>
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
  tone: 'blue' | 'green' | 'orange' | 'red'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    red: 'text-red-700 bg-red-50',
  }[tone]

  return (
    <div className="harmony-card harmony-hover-lift harmony-slide-up p-5">
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

function DetailCard({
  label,
  value,
  subValue,
  icon,
  tone,
}: {
  label: string
  value: string
  subValue: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    green: 'bg-[#eaf8ee] text-[#168034]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className="rounded-[24px] border border-black/5 bg-white/80 p-4 shadow-sm">
      <div className={`mb-4 inline-flex rounded-2xl p-3 ${toneClass}`}>
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {label}
      </p>

      <p className="mt-2 truncate font-semibold text-[#1d1d1f]">
        {value}
      </p>

      <p className="mt-1 truncate text-xs text-[#6e6e73]">
        {subValue}
      </p>
    </div>
  )
}

function InfoPanel({
  title,
  icon,
  content,
}: {
  title: string
  icon: React.ReactNode
  content: string
}) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-[#f5f5f7]/70 p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold text-[#1d1d1f]">
        <span className="text-[#007aff]">
          {icon}
        </span>
        {title}
      </div>

      <p className="min-h-20 text-sm leading-6 text-[#6e6e73]">
        {content}
      </p>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: {
    label: string
    value: string
  }[]
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="harmony-select"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
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

function ApprovalMini({
  name,
  status,
}: {
  name: string
  status: string
}) {
  return (
    <div className="min-w-0">
      <div className="max-w-[130px] truncate text-xs font-semibold text-[#1d1d1f]">
        {name}
      </div>

      <StatusBadge status={status} compact />
    </div>
  )
}

function StatusBadge({
  status,
  compact = false,
}: {
  status: string
  compact?: boolean
}) {
  const className =
    status === 'approved'
      ? 'bg-green-50 text-green-700'
      : status === 'rejected' || status === 'cancelled'
        ? 'bg-red-50 text-red-700'
        : status === 'skipped'
          ? 'bg-[#f5f5f7] text-[#6e6e73]'
          : 'bg-orange-50 text-orange-700'

  return (
    <span
      className={[
        'inline-flex rounded-full font-bold capitalize',
        compact ? 'mt-1 px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className,
      ].join(' ')}
    >
      {formatStatusText(status)}
    </span>
  )
}

function ActionButton({
  title,
  icon,
  tone,
  onClick,
}: {
  title: string
  icon: React.ReactNode
  tone: 'blue' | 'neutral' | 'red'
  onClick: () => void
}) {
  const className = {
    blue: 'border border-black/5 bg-white text-[#007aff] hover:bg-[#f5f5f7]',
    neutral: 'border border-black/5 bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]',
    red: 'bg-red-50 text-red-700 hover:bg-red-100',
  }[tone]

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      {icon}
    </button>
  )
}

function AlertBox({
  type,
  message,
}: {
  type: 'success' | 'error'
  message: string
}) {
  const className =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-600'

  return (
    <div className={`rounded-2xl border p-4 text-sm ${className}`}>
      {message}
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
    <div className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
        <FileText size={24} />
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

function formatBalanceSource(value: string | null | undefined) {
  if (value === 'annual_leave') return 'Cuti Tahunan'
  if (value === 'phl') return 'PHL'
  if (value === 'none') return 'Tanpa Saldo'

  return value || '-'
}

function formatStatusText(status: string) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'pending') return 'Pending'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'skipped') return 'Skipped'

  return status.replace('_', ' ')
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)

  if (words.length === 0) return 'R'

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}