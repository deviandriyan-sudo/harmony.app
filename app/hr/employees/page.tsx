'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarClock,
  Clock3,
  History,
  Eye,
  Fingerprint,
  GitBranch,
  HeartHandshake,
  Mail,
  Loader2,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type Employee = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  gender: string | null
  department: string | null
  position: string | null
  join_date: string | null
  employment_status: string | null
  supervisor_1: string | null
  supervisor_2: string | null
  annual_leave_balance: number | null
  phl_balance: number | null
  is_active: boolean | null
  personal_phone?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  personal_updated_at?: string | null
  personal_updated_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type ProfileUpdateLog = {
  id: string
  employee_id: string | null
  employee_number: string | null
  full_name: string | null
  email: string | null
  updated_by: string | null
  update_source: string | null
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  created_at: string | null
}

type MasterOption = {
  id: string
  option_type: 'department' | 'position'
  option_value: string
  is_active: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

type EmployeeAssignment = {
  id: string
  employee_id: string
  employee_number: string | null
  full_name: string | null
  assignment_department: string | null
  assignment_position: string | null
  assignment_type: string | null
  supervisor_1: string | null
  supervisor_2: string | null
  start_date: string | null
  end_date: string | null
  is_primary: boolean | null
  is_active: boolean | null
  notes: string | null
  created_at?: string | null
  updated_at?: string | null
}

type EmployeeForm = {
  employee_number: string
  machine_pin: string
  full_name: string
  email: string
  phone: string
  gender: string
  department: string
  position: string
  join_date: string
  employment_status: string
  supervisor_1: string
  supervisor_2: string
  annual_leave_balance: number
  phl_balance: number
  is_active: boolean
  personal_phone: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

type AssignmentForm = {
  assignment_department: string
  assignment_position: string
  assignment_type: string
  supervisor_1: string
  supervisor_2: string
  start_date: string
  end_date: string
  notes: string
}


type PHLBalanceLot = {
  id: string
  phl_date: string | null
  valid_from: string | null
  expired_at: string | null
  balance_days: number | null
  used_days: number | null
  remaining_days: number | null
  description?: string | null
  reason: string | null
  notes: string | null
  is_expired: boolean
  days_to_expiry: number | null
}

type PHLAdjustmentLog = {
  id: string
  action: 'add' | 'subtract'
  days: number
  phl_date: string | null
  expired_at: string | null
  balance_before: number
  balance_after: number
  description?: string | null
  reason: string
  actor_email: string | null
  created_at: string | null
}

type PHLBalanceDetail = {
  success: boolean
  employee_id: string
  employee_number: string | null
  full_name: string | null
  active_balance: number
  active_ledger_balance: number
  legacy_balance: number
  expired_balance: number
  expiring_30_days: number
  next_expiry: string | null
  expiry_rule_days: number
  lots: PHLBalanceLot[]
  adjustments: PHLAdjustmentLog[]
}

type PHLAdjustmentForm = {
  action: 'add' | 'subtract'
  days: number
  phl_date: string
  description: string
  reason: string
}

const initialForm: EmployeeForm = {
  employee_number: '',
  machine_pin: '',
  full_name: '',
  email: '',
  phone: '',
  gender: 'all',
  department: '',
  position: '',
  join_date: '',
  employment_status: 'active',
  supervisor_1: '',
  supervisor_2: '',
  annual_leave_balance: 12,
  phl_balance: 0,
  is_active: true,
  personal_phone: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
}

const initialAssignmentForm: AssignmentForm = {
  assignment_department: '',
  assignment_position: '',
  assignment_type: 'additional_assignment',
  supervisor_1: '',
  supervisor_2: '',
  start_date: '',
  end_date: '',
  notes: '',
}


const initialPHLAdjustmentForm: PHLAdjustmentForm = {
  action: 'add',
  days: 1,
  phl_date: '',
  description: '',
  reason: '',
}

const assignmentTypeOptions = [
  { label: 'Penugasan Tambahan', value: 'additional_assignment' },
  { label: 'Jabatan Struktural', value: 'structural' },
  { label: 'Koordinator / PIC', value: 'coordinator' },
  { label: 'Task Force / Tim Khusus', value: 'task_force' },
  { label: 'Plt. / Pelaksana Tugas', value: 'acting' },
]

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [profileLogs, setProfileLogs] = useState<ProfileUpdateLog[]>([])
  const [masterOptions, setMasterOptions] = useState<MasterOption[]>([])
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [syncFilter, setSyncFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [savingOptionType, setSavingOptionType] = useState<'department' | 'position' | null>(null)
  const [deletingOptionId, setDeletingOptionId] = useState<string | null>(null)
  const [bulkDeletingOptions, setBulkDeletingOptions] = useState(false)
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null)

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [masterOptionsModalOpen, setMasterOptionsModalOpen] = useState(false)
  const [selectedMasterOptionIds, setSelectedMasterOptionIds] = useState<string[]>([])

  const [newDepartmentOption, setNewDepartmentOption] = useState('')
  const [newPositionOption, setNewPositionOption] = useState('')
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(initialAssignmentForm)

  const [phlBalanceDetail, setPHLBalanceDetail] = useState<PHLBalanceDetail | null>(null)
  const [phlAdjustmentForm, setPHLAdjustmentForm] = useState<PHLAdjustmentForm>(
    initialPHLAdjustmentForm
  )
  const [loadingPHLBalance, setLoadingPHLBalance] = useState(false)
  const [savingPHLAdjustment, setSavingPHLAdjustment] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<EmployeeForm>(initialForm)

  useEffect(() => {
    fetchEmployees()
  }, [])

  function normalizeMasterType(value: unknown): 'department' | 'position' | null {
    const text = normalizeText(value)

    if (!text) return null

    if (
      text === 'department' ||
      text === 'departemen' ||
      text === 'unit' ||
      text.includes('department') ||
      text.includes('departemen')
    ) {
      return 'department'
    }

    if (
      text === 'position' ||
      text === 'jabatan' ||
      text.includes('position') ||
      text.includes('jabatan') ||
      text.includes('job')
    ) {
      return 'position'
    }

    return null
  }

  function getMasterName(row: any) {
    return String(
      row?.name ||
        row?.option_value ||
        row?.department_name ||
        row?.department ||
        row?.unit_name ||
        row?.unit ||
        row?.position_name ||
        row?.position ||
        row?.job_title ||
        row?.job_position ||
        row?.label ||
        row?.value ||
        ''
    ).trim()
  }

  function buildMergedMasterOptions({
    masterRows,
    departmentRows,
    positionRows,
    employeesRows,
    assignmentRows,
  }: {
    masterRows: any[]
    departmentRows: any[]
    positionRows: any[]
    employeesRows: Employee[]
    assignmentRows: EmployeeAssignment[]
  }) {
    const map = new Map<string, MasterOption>()

    function addOption(
      optionType: 'department' | 'position',
      value: string,
      idPrefix: string,
      isActive: boolean | null | undefined = true
    ) {
      const cleanValue = value.trim()

      if (!cleanValue || isActive === false) return

      const key = `${optionType}:${normalizeText(cleanValue)}`

      if (map.has(key)) return

      map.set(key, {
        id: `${idPrefix}:${key}`,
        option_type: optionType,
        option_value: cleanValue,
        is_active: true,
      })
    }

    masterRows.forEach((row) => {
      const optionType = normalizeMasterType(row?.option_type)
      const value = getMasterName(row)

      if (!optionType || !value) return

      addOption(optionType, value, `master:${row?.id || value}`, row?.is_active)
    })

    departmentRows.forEach((row) => {
      addOption('department', getMasterName(row), `department:${row?.id || getMasterName(row)}`, row?.is_active)
    })

    positionRows.forEach((row) => {
      addOption('position', getMasterName(row), `position:${row?.id || getMasterName(row)}`, row?.is_active)
    })

    employeesRows.forEach((employee) => {
      if (employee.department) addOption('department', employee.department, 'employee-department')
      if (employee.position) addOption('position', employee.position, 'employee-position')
    })

    assignmentRows.forEach((assignment) => {
      if (assignment.assignment_department) {
        addOption('department', assignment.assignment_department, 'assignment-department')
      }

      if (assignment.assignment_position) {
        addOption('position', assignment.assignment_position, 'assignment-position')
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      if (a.option_type !== b.option_type) return a.option_type.localeCompare(b.option_type)
      return a.option_value.localeCompare(b.option_value)
    })
  }

  async function fetchEmployees() {
    setLoading(true)
    setErrorMessage('')

    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true })

      if (employeeError) throw employeeError

      const employeesRows = (employeeData || []) as Employee[]
      setEmployees(employeesRows)

      const { data: logsData, error: logsError } = await supabase
        .from('employee_profile_update_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      if (!logsError) {
        setProfileLogs((logsData || []) as ProfileUpdateLog[])
      } else {
        console.warn('employee_profile_update_logs gagal dibaca:', logsError.message)
        setProfileLogs([])
      }

      const { data: optionData, error: optionError } = await supabase
        .from('hr_master_options')
        .select('*')
        .order('option_value', { ascending: true })

      if (optionError) {
        console.warn('hr_master_options gagal dibaca:', optionError.message)
      }

      const { data: departmentData, error: departmentError } = await supabase
        .from('hr_employee_departments')
        .select('*')
        .order('name', { ascending: true })

      if (departmentError) {
        console.warn('hr_employee_departments gagal dibaca:', departmentError.message)
      }

      const { data: positionData, error: positionError } = await supabase
        .from('hr_employee_positions')
        .select('*')
        .order('name', { ascending: true })

      if (positionError) {
        console.warn('hr_employee_positions gagal dibaca:', positionError.message)
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('employee_assignments')
        .select('*')
        .order('created_at', { ascending: false })

      const assignmentRows = assignmentError
        ? []
        : ((assignmentData || []) as EmployeeAssignment[])

      if (assignmentError) {
        console.warn('employee_assignments gagal dibaca:', assignmentError.message)
      }

      setAssignments(assignmentRows)
      setMasterOptions(
        buildMergedMasterOptions({
          masterRows: optionData || [],
          departmentRows: departmentData || [],
          positionRows: positionData || [],
          employeesRows,
          assignmentRows,
        })
      )
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal memuat data karyawan.')
      setEmployees([])
      setMasterOptions([])
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  function updateForm(field: keyof EmployeeForm, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateAssignmentForm(field: keyof AssignmentForm, value: string) {
    setAssignmentForm((prev) => ({ ...prev, [field]: value }))
  }

  function updatePHLAdjustmentForm<K extends keyof PHLAdjustmentForm>(
    field: K,
    value: PHLAdjustmentForm[K]
  ) {
    setPHLAdjustmentForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function fetchEmployeePHLBalanceDetail(employeeId: string) {
    setLoadingPHLBalance(true)

    try {
      const { data, error } = await supabase.rpc(
        'hr_get_employee_phl_balance_detail_v2',
        {
          p_employee_id: employeeId,
        }
      )

      if (!error && data) {
        const detail = data as PHLBalanceDetail
        setPHLBalanceDetail(detail)
        setForm((current) => ({
          ...current,
          phl_balance: Number(detail.active_balance ?? current.phl_balance ?? 0),
        }))
        return
      }

      // Fallback: jangan membuat saldo tampil 0 hanya karena RPC detail gagal.
      const [
        summaryResponse,
        employeeResponse,
        lotsResponse,
        adjustmentsResponse,
      ] = await Promise.all([
        supabase
          .from('employee_phl_balance_summary')
          .select('*')
          .eq('employee_id', employeeId)
          .maybeSingle(),
        supabase
          .from('employees')
          .select('id, employee_number, full_name, phl_balance')
          .eq('id', employeeId)
          .maybeSingle(),
        supabase
          .from('phl_records')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('source', 'attendance_phl_approved')
          .eq('status', 'approved')
          .order('expired_at', { ascending: true }),
        supabase
          .from('phl_hr_adjustments')
          .select('*')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      const summary = (summaryResponse.data || {}) as Record<string, any>
      const employeeRow = (employeeResponse.data || {}) as Record<string, any>
      const lotsRaw = Array.isArray(lotsResponse.data) ? lotsResponse.data : []
      const adjustmentsRaw = Array.isArray(adjustmentsResponse.data)
        ? adjustmentsResponse.data
        : []

      const today = getTodayISO()

      const activeLots = lotsRaw.filter((row: any) => {
        const remaining = Number(row.remaining_days || 0)
        const expiredAt = String(row.expired_at || '')
        return remaining > 0 && (!expiredAt || expiredAt >= today)
      })

      const expiredLots = lotsRaw.filter((row: any) => {
        const remaining = Number(row.remaining_days || 0)
        const expiredAt = String(row.expired_at || '')
        return remaining > 0 && Boolean(expiredAt) && expiredAt < today
      })

      const activeLedgerBalance = activeLots.reduce(
        (sum: number, row: any) => sum + Number(row.remaining_days || 0),
        0
      )

      const expiredBalance = expiredLots.reduce(
        (sum: number, row: any) => sum + Number(row.remaining_days || 0),
        0
      )

      const availableFromSummary = Number(summary.total_available_days)
      const availableFromEmployee = Number(employeeRow.phl_balance)

      const activeBalance = Number.isFinite(availableFromSummary)
        ? availableFromSummary
        : Number.isFinite(availableFromEmployee)
          ? availableFromEmployee
          : activeLedgerBalance

      const legacyBalance = Math.max(activeBalance - activeLedgerBalance, 0)

      const expiringLots = activeLots.filter((row: any) => {
        if (!row.expired_at) return false
        const diff = daysBetweenISO(today, String(row.expired_at))
        return diff >= 0 && diff <= 30
      })

      const expiring30Days = expiringLots.reduce(
        (sum: number, row: any) => sum + Number(row.remaining_days || 0),
        0
      )

      const nextExpiry =
        activeLots
          .map((row: any) => String(row.expired_at || ''))
          .filter(Boolean)
          .sort()[0] || null

      const fallbackDetail: PHLBalanceDetail = {
        success: true,
        employee_id: employeeId,
        employee_number: String(employeeRow.employee_number || ''),
        full_name: String(employeeRow.full_name || ''),
        active_balance: activeBalance,
        active_ledger_balance: activeLedgerBalance,
        legacy_balance: legacyBalance,
        expired_balance: expiredBalance,
        expiring_30_days: expiring30Days,
        next_expiry: nextExpiry,
        expiry_rule_days: 90,
        lots: lotsRaw.map((row: any) => ({
          ...row,
          description: row.reason || null,
          is_expired:
            Boolean(row.expired_at) &&
            String(row.expired_at) < today,
          days_to_expiry: row.expired_at
            ? daysBetweenISO(today, String(row.expired_at))
            : null,
        })) as PHLBalanceLot[],
        adjustments: adjustmentsRaw as PHLAdjustmentLog[],
      }

      setPHLBalanceDetail(fallbackDetail)
      setForm((current) => ({
        ...current,
        phl_balance: activeBalance,
      }))

      if (error) {
        console.warn(
          'RPC detail PHL V2 gagal, menggunakan fallback data langsung:',
          error.message
        )
      }
    } catch (error: any) {
      // Pertahankan saldo yang sudah ada pada form; jangan ubah menjadi 0.
      setPHLBalanceDetail(null)
      setErrorMessage(
        error?.message ||
          'Detail saldo PHL gagal dimuat. Saldo utama tetap ditampilkan dari data karyawan.'
      )
    } finally {
      setLoadingPHLBalance(false)
    }
  }

  async function handlePHLBalanceAdjustment() {
    if (!editingEmployeeId) {
      setErrorMessage('Simpan data karyawan terlebih dahulu sebelum menyesuaikan saldo PHL.')
      return
    }

    const days = Number(phlAdjustmentForm.days || 0)
    const description = phlAdjustmentForm.description.trim()
    const reason = phlAdjustmentForm.reason.trim()

    if (days <= 0) {
      setErrorMessage('Jumlah penyesuaian PHL harus lebih dari 0 hari.')
      return
    }

    if (phlAdjustmentForm.action === 'add' && description.length < 3) {
      setErrorMessage('Keterangan saldo PHL minimal 3 karakter.')
      return
    }

    if (reason.length < 5) {
      setErrorMessage('Alasan penyesuaian HR minimal 5 karakter.')
      return
    }

    if (phlAdjustmentForm.action === 'add' && !phlAdjustmentForm.phl_date) {
      setErrorMessage('Tanggal pelaksanaan PHL wajib diisi untuk penambahan saldo.')
      return
    }

    setSavingPHLAdjustment(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data: authData } = await supabase.auth.getUser()
      const actorEmail = authData.user?.email || 'HR Administrator'

      const { data, error } = await supabase.rpc(
        'hr_adjust_employee_phl_balance_v2',
        {
          p_request_key: crypto.randomUUID(),
          p_employee_id: editingEmployeeId,
          p_action: phlAdjustmentForm.action,
          p_days: days,
          p_phl_date:
            phlAdjustmentForm.action === 'add'
              ? phlAdjustmentForm.phl_date
              : null,
          p_description: description,
          p_reason: reason,
          p_actor_email: actorEmail,
        }
      )

      if (error) throw error

      const result = (data || {}) as {
        success?: boolean
        balance_before?: number
        balance_after?: number
        expired_at?: string | null
        description?: string | null
        total_available_days?: number
        message?: string
      }

      if (!result.success) {
        throw new Error(result.message || 'Penyesuaian saldo PHL belum berhasil.')
      }

      setSuccessMessage(
        `${result.message || 'Saldo PHL berhasil disesuaikan.'} Saldo aktif: ${
          result.balance_before ?? 0
        } → ${result.balance_after ?? 0} hari.${
          result.expired_at
            ? ` Expired: ${formatDate(result.expired_at)}.`
            : ''
        }`
      )

      setPHLAdjustmentForm({
        action: phlAdjustmentForm.action,
        days: 1,
        phl_date:
          phlAdjustmentForm.action === 'add'
            ? getTodayISO()
            : '',
        description: '',
        reason: '',
      })

      await Promise.all([
        fetchEmployeePHLBalanceDetail(editingEmployeeId),
        fetchEmployees(),
      ])
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Penyesuaian saldo PHL gagal. Tidak ada perubahan saldo yang disimpan.'
      )
    } finally {
      setSavingPHLAdjustment(false)
    }
  }

  function resetForm() {
    setForm(initialForm)
    setAssignmentForm(initialAssignmentForm)
    setPHLAdjustmentForm(initialPHLAdjustmentForm)
    setPHLBalanceDetail(null)
    setLoadingPHLBalance(false)
    setSavingPHLAdjustment(false)
    setEditingEmployeeId(null)
    setEditModalOpen(false)
    setErrorMessage('')
  }

  function handleAddNew() {
    setForm(initialForm)
    setAssignmentForm(initialAssignmentForm)
    setPHLAdjustmentForm(initialPHLAdjustmentForm)
    setPHLBalanceDetail(null)
    setEditingEmployeeId(null)
    setSelectedEmployee(null)
    setEditModalOpen(true)
    setSuccessMessage('')
    setErrorMessage('')
  }

  function openEditModal(employee: Employee) {
    setEditingEmployeeId(employee.id)
    setForm(employeeToForm(employee))
    setAssignmentForm(initialAssignmentForm)
    setPHLAdjustmentForm({
      ...initialPHLAdjustmentForm,
      phl_date: getTodayISO(),
      description: '',
    })
    setPHLBalanceDetail(null)
    setEditModalOpen(true)
    setSelectedEmployee(null)
    setSuccessMessage('')
    setErrorMessage('')
    void fetchEmployeePHLBalanceDetail(employee.id)
  }

  const activeMasterOptions = useMemo(() => {
    return masterOptions.filter((option) => option.is_active !== false)
  }, [masterOptions])

  const departmentOptions = useMemo(() => {
    return activeMasterOptions
      .filter((option) => option.option_type === 'department')
      .map((option) => option.option_value)
      .sort((a, b) => a.localeCompare(b))
  }, [activeMasterOptions])

  const positionOptions = useMemo(() => {
    return activeMasterOptions
      .filter((option) => option.option_type === 'position')
      .map((option) => option.option_value)
      .sort((a, b) => a.localeCompare(b))
  }, [activeMasterOptions])

  const departments = useMemo(() => {
    const unique = new Set<string>()
    employees.forEach((employee) => {
      if (employee.department) unique.add(employee.department)
    })
    return Array.from(unique).sort()
  }, [employees])

  const currentEmployeeAssignments = useMemo(() => {
    if (!editingEmployeeId) return []

    return assignments.filter((assignment) => {
      return assignment.employee_id === editingEmployeeId && assignment.is_active !== false
    })
  }, [assignments, editingEmployeeId])

  const selectedEmployeeAssignments = useMemo(() => {
    if (!selectedEmployee) return []

    return assignments.filter((assignment) => {
      return assignment.employee_id === selectedEmployee.id && assignment.is_active !== false
    })
  }, [assignments, selectedEmployee])

  const filteredEmployees = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return employees.filter((employee) => {
      const employeeAssignments = assignments.filter((assignment) => {
        return assignment.employee_id === employee.id && assignment.is_active !== false
      })

      const assignmentText = employeeAssignments
        .map((assignment) => `${assignment.assignment_department || ''} ${assignment.assignment_position || ''}`)
        .join(' ')
        .toLowerCase()

      const matchesKeyword =
        !keyword ||
        employee.full_name?.toLowerCase().includes(keyword) ||
        employee.employee_number?.toLowerCase().includes(keyword) ||
        employee.machine_pin?.toLowerCase().includes(keyword) ||
        employee.department?.toLowerCase().includes(keyword) ||
        employee.position?.toLowerCase().includes(keyword) ||
        employee.email?.toLowerCase().includes(keyword) ||
        employee.phone?.toLowerCase().includes(keyword) ||
        employee.personal_phone?.toLowerCase().includes(keyword) ||
        employee.emergency_contact_name?.toLowerCase().includes(keyword) ||
        employee.emergency_contact_phone?.toLowerCase().includes(keyword) ||
        employee.address?.toLowerCase().includes(keyword) ||
        assignmentText.includes(keyword)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && employee.is_active !== false) ||
        (statusFilter === 'inactive' && employee.is_active === false)

      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter
      const hasPersonalUpdate = Boolean(employee.personal_updated_at)
      const matchesSync =
        syncFilter === 'all' ||
        (syncFilter === 'updated_by_employee' && hasPersonalUpdate) ||
        (syncFilter === 'not_updated' && !hasPersonalUpdate)

      return matchesKeyword && matchesStatus && matchesDepartment && matchesSync
    })
  }, [employees, assignments, search, statusFilter, departmentFilter, syncFilter])

  const totalEmployees = employees.length
  const activeEmployees = employees.filter((employee) => employee.is_active !== false).length
  const inactiveEmployees = employees.filter((employee) => employee.is_active === false).length
  const withMachinePin = employees.filter((employee) => Boolean(employee.machine_pin)).length
  const withEmail = employees.filter((employee) => Boolean(employee.email)).length
  const updatedPersonalData = employees.filter((employee) => Boolean(employee.personal_updated_at)).length
  const activeAssignments = assignments.filter((assignment) => assignment.is_active !== false).length

  function isMissingTableError(error: any) {
    const message = String(
      error?.message || error?.details || error?.hint || error?.code || ''
    ).toLowerCase()

    return (
      message.includes('could not find the table') ||
      message.includes('relation') && message.includes('does not exist') ||
      message.includes('does not exist') ||
      message.includes('schema cache')
    )
  }

  async function activateNameInTable(tableName: string, value: string) {
    const now = new Date().toISOString()

    const { data: existingRows, error: findError } = await supabase
      .from(tableName)
      .select('id,name,is_active')
      .ilike('name', value)
      .limit(1)

    if (findError) {
      if (isMissingTableError(findError)) {
        console.warn(`${tableName} tidak tersedia, dilewati.`)
        return
      }

      throw findError
    }

    const existing = existingRows?.[0]

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ name: value, is_active: true, updated_at: now })
        .eq('id', existing.id)

      if (updateError) throw updateError
      return
    }

    const { error: insertError } = await supabase
      .from(tableName)
      .insert({ name: value, is_active: true, created_at: now, updated_at: now })

    if (insertError) throw insertError
  }

  async function activateLegacyMasterOption(optionType: 'department' | 'position', value: string) {
    const now = new Date().toISOString()

    const { data: existingRows, error: findError } = await supabase
      .from('hr_master_options')
      .select('id,option_type,option_value,is_active')
      .eq('option_type', optionType)
      .ilike('option_value', value)
      .limit(1)

    if (findError) {
      if (isMissingTableError(findError)) {
        console.warn('hr_master_options tidak tersedia, dilewati.')
        return
      }

      throw findError
    }

    const existing = existingRows?.[0]

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('hr_master_options')
        .update({ option_value: value, is_active: true, updated_at: now })
        .eq('id', existing.id)

      if (updateError) throw updateError
      return
    }

    const { error: insertError } = await supabase
      .from('hr_master_options')
      .insert({
        option_type: optionType,
        option_value: value,
        is_active: true,
        created_at: now,
        updated_at: now,
      })

    if (insertError) throw insertError
  }

  async function ensureMasterOption(optionType: 'department' | 'position', rawValue: string) {
    const value = rawValue.trim()

    if (!value) return

    const tableName =
      optionType === 'department'
        ? 'hr_employee_departments'
        : 'hr_employee_positions'

    await activateNameInTable(tableName, value)
    await activateLegacyMasterOption(optionType, value)
  }

  async function deactivateMasterOptionEverywhere(option: MasterOption) {
    const now = new Date().toISOString()
    const value = option.option_value.trim()

    if (!value) return

    const canonicalTable =
      option.option_type === 'department'
        ? 'hr_employee_departments'
        : 'hr_employee_positions'

    const { error: canonicalError } = await supabase
      .from(canonicalTable)
      .update({ is_active: false, updated_at: now })
      .ilike('name', value)

    if (canonicalError && !isMissingTableError(canonicalError)) {
      throw canonicalError
    }

    const { error: legacyError } = await supabase
      .from('hr_master_options')
      .update({ is_active: false, updated_at: now })
      .eq('option_type', option.option_type)
      .ilike('option_value', value)

    if (legacyError && !isMissingTableError(legacyError)) {
      throw legacyError
    }
  }

  async function handleAddMasterOption(optionType: 'department' | 'position') {
    const value = optionType === 'department' ? newDepartmentOption : newPositionOption
    const trimmedValue = value.trim()

    setErrorMessage('')
    setSuccessMessage('')

    if (!trimmedValue) {
      setErrorMessage(optionType === 'department' ? 'Nama departemen wajib diisi.' : 'Nama jabatan wajib diisi.')
      return
    }

    setSavingOptionType(optionType)

    try {
      await ensureMasterOption(optionType, trimmedValue)

      if (optionType === 'department') setNewDepartmentOption('')
      if (optionType === 'position') setNewPositionOption('')

      setSuccessMessage(optionType === 'department' ? 'Departemen berhasil ditambahkan ke dropdown.' : 'Jabatan berhasil ditambahkan ke dropdown.')
      await fetchEmployees()
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal menambahkan pilihan dropdown.')
    } finally {
      setSavingOptionType(null)
    }
  }

  async function handleDeleteMasterOption(option: MasterOption) {
    const confirmed = window.confirm(`Hapus "${option.option_value}" dari dropdown? Data karyawan lama tidak akan diubah.`)

    if (!confirmed) return

    setErrorMessage('')
    setSuccessMessage('')
    setDeletingOptionId(option.id)

    try {
      await deactivateMasterOptionEverywhere(option)

      setSelectedMasterOptionIds((current) => current.filter((id) => id !== option.id))
      setSuccessMessage(`${option.option_value} berhasil dihapus dari dropdown.`)
      await fetchEmployees()
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal menghapus pilihan dropdown.')
    } finally {
      setDeletingOptionId(null)
    }
  }


  function toggleMasterOptionSelection(optionId: string) {
    setSelectedMasterOptionIds((current) => {
      if (current.includes(optionId)) {
        return current.filter((id) => id !== optionId)
      }

      return [...current, optionId]
    })
  }

  function toggleAllMasterOptionSelection(options: MasterOption[]) {
    const optionIds = options.map((option) => option.id)
    const allSelected = optionIds.length > 0 && optionIds.every((id) => selectedMasterOptionIds.includes(id))

    setSelectedMasterOptionIds((current) => {
      if (allSelected) {
        return current.filter((id) => !optionIds.includes(id))
      }

      return Array.from(new Set([...current, ...optionIds]))
    })
  }

  async function handleBulkDeleteMasterOptions() {
    const uniqueIds = Array.from(new Set(selectedMasterOptionIds))

    if (uniqueIds.length === 0) {
      setErrorMessage('Centang minimal 1 pilihan departemen atau jabatan untuk dihapus dari dropdown.')
      return
    }

    const selectedOptions = masterOptions.filter((option) => uniqueIds.includes(option.id))
    const confirmed = window.confirm(`Hapus ${selectedOptions.length} pilihan dari dropdown? Data karyawan lama tidak akan diubah.`)

    if (!confirmed) return

    setErrorMessage('')
    setSuccessMessage('')
    setBulkDeletingOptions(true)

    try {
      for (const option of selectedOptions) {
        await deactivateMasterOptionEverywhere(option)
      }

      setSelectedMasterOptionIds([])
      setSuccessMessage(`${selectedOptions.length} pilihan berhasil dihapus dari dropdown.`)
      await fetchEmployees()
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal menghapus pilihan dropdown secara massal.')
    } finally {
      setBulkDeletingOptions(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.employee_number || !form.full_name || !form.machine_pin) {
      setErrorMessage('Employee number, nama, dan machine PIN wajib diisi.')
      setSaving(false)
      return
    }

    try {
      await ensureMasterOption('department', form.department)
      await ensureMasterOption('position', form.position)

      const now = new Date().toISOString()
      const payload = {
        employee_number: form.employee_number.trim(),
        machine_pin: form.machine_pin.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        gender: form.gender || 'all',
        department: form.department.trim() || null,
        position: form.position.trim() || null,
        join_date: form.join_date || null,
        employment_status: form.employment_status || 'active',
        supervisor_1: form.supervisor_1.trim() || null,
        supervisor_2: form.supervisor_2.trim() || null,
        schedule_group: 'regular',
        auto_detect_schedule: true,
        annual_leave_balance: form.annual_leave_balance,
        is_active: form.is_active,
        personal_phone: form.personal_phone.trim() || null,
        address: form.address.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        updated_at: now,
      }

      if (editingEmployeeId) {
        const { error } = await supabase.from('employees').update(payload).eq('id', editingEmployeeId)
        if (error) throw error
        setSuccessMessage('Data karyawan berhasil diperbarui.')
      } else {
        const { error } = await supabase.from('employees').insert({ ...payload, created_at: now })
        if (error) throw error
        setSuccessMessage('Data karyawan berhasil ditambahkan.')
      }

      resetForm()
      await fetchEmployees()
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal menyimpan data karyawan.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAssignment() {
    setErrorMessage('')
    setSuccessMessage('')

    if (!editingEmployeeId) {
      setErrorMessage('Simpan data karyawan terlebih dahulu sebelum menambahkan jabatan rangkap.')
      return
    }

    const currentEmployee = employees.find((employee) => employee.id === editingEmployeeId)

    if (!currentEmployee) {
      setErrorMessage('Data karyawan tidak ditemukan.')
      return
    }

    if (!assignmentForm.assignment_department.trim() || !assignmentForm.assignment_position.trim()) {
      setErrorMessage('Departemen dan jabatan penugasan tambahan wajib diisi.')
      return
    }

    setSavingAssignment(true)

    try {
      await ensureMasterOption('department', assignmentForm.assignment_department)
      await ensureMasterOption('position', assignmentForm.assignment_position)

      const now = new Date().toISOString()

      const { error } = await supabase.from('employee_assignments').insert({
        employee_id: currentEmployee.id,
        employee_number: currentEmployee.employee_number,
        full_name: currentEmployee.full_name,
        assignment_department: assignmentForm.assignment_department.trim(),
        assignment_position: assignmentForm.assignment_position.trim(),
        assignment_type: assignmentForm.assignment_type || 'additional_assignment',
        supervisor_1: assignmentForm.supervisor_1.trim() || null,
        supervisor_2: assignmentForm.supervisor_2.trim() || null,
        start_date: assignmentForm.start_date || null,
        end_date: assignmentForm.end_date || null,
        is_primary: false,
        is_active: true,
        notes: assignmentForm.notes.trim() || null,
        created_at: now,
        updated_at: now,
      })

      if (error) throw error

      setAssignmentForm(initialAssignmentForm)
      setSuccessMessage('Penugasan tambahan berhasil ditambahkan.')
      await fetchEmployees()
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal menambahkan penugasan tambahan.')
    } finally {
      setSavingAssignment(false)
    }
  }

  async function handleDeleteAssignment(assignment: EmployeeAssignment) {
    const confirmed = window.confirm(`Hapus penugasan "${assignment.assignment_position || '-'}" dari data karyawan ini?`)

    if (!confirmed) return

    setErrorMessage('')
    setSuccessMessage('')
    setDeletingAssignmentId(assignment.id)

    try {
      const { error } = await supabase
        .from('employee_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', assignment.id)

      if (error) throw error

      setSuccessMessage('Penugasan tambahan berhasil dihapus dari karyawan.')
      await fetchEmployees()
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal menghapus penugasan tambahan.')
    } finally {
      setDeletingAssignmentId(null)
    }
  }

  async function handleToggleActive(employee: Employee) {
    setErrorMessage('')
    setSuccessMessage('')

    const nextStatus = !employee.is_active
    const { error } = await supabase
      .from('employees')
      .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', employee.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSuccessMessage(nextStatus ? 'Karyawan berhasil diaktifkan kembali.' : 'Karyawan berhasil dinonaktifkan.')
    await fetchEmployees()
  }

  return (
    <>
      <Topbar
        title="Data Karyawan"
        description="Kelola master employee, dropdown organisasi, supervisor, dan penugasan rangkap."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 overflow-x-hidden p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <SummaryCard title="Total Employee" value={String(totalEmployees)} description="Seluruh data" icon={<Users size={20} />} tone="blue" />
          <SummaryCard title="Active" value={String(activeEmployees)} description="Karyawan aktif" icon={<BadgeCheck size={20} />} tone="green" />
          <SummaryCard title="Machine PIN" value={String(withMachinePin)} description="Siap absensi" icon={<Fingerprint size={20} />} tone="purple" />
          <SummaryCard title="Email" value={String(withEmail)} description="Siap notifikasi" icon={<Mail size={20} />} tone="cyan" />
          <SummaryCard title="Update Pribadi" value={String(updatedPersonalData)} description="Diupdate employee" icon={<Clock3 size={20} />} tone="orange" />
          <SummaryCard title="Jabatan Rangkap" value={String(activeAssignments)} description="Penugasan aktif" icon={<Briefcase size={20} />} tone="indigo" />
          <SummaryCard title="Inactive" value={String(inactiveEmployees)} description="Nonaktif" icon={<Power size={20} />} tone="red" />
        </div>

        <MasterOptionsLauncher
          departmentCount={activeMasterOptions.filter((option) => option.option_type === 'department').length}
          positionCount={activeMasterOptions.filter((option) => option.option_type === 'position').length}
          selectedCount={selectedMasterOptionIds.length}
          onOpen={() => setMasterOptionsModalOpen(true)}
        />

        {masterOptionsModalOpen && (
          <MasterOptionsModal
            departmentOptions={activeMasterOptions.filter((option) => option.option_type === 'department')}
            positionOptions={activeMasterOptions.filter((option) => option.option_type === 'position')}
            newDepartmentOption={newDepartmentOption}
            newPositionOption={newPositionOption}
            savingOptionType={savingOptionType}
            deletingOptionId={deletingOptionId}
            bulkDeletingOptions={bulkDeletingOptions}
            selectedOptionIds={selectedMasterOptionIds}
            onDepartmentChange={setNewDepartmentOption}
            onPositionChange={setNewPositionOption}
            onAdd={handleAddMasterOption}
            onDelete={handleDeleteMasterOption}
            onBulkDelete={handleBulkDeleteMasterOptions}
            onToggleSelection={toggleMasterOptionSelection}
            onToggleAll={toggleAllMasterOptionSelection}
            onClose={() => setMasterOptionsModalOpen(false)}
          />
        )}

        {profileLogs.length > 0 && (
          <div className="harmony-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-black/5 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-[#1d1d1f]">Update Data Pribadi Terbaru</h2>
                <p className="mt-1 text-sm text-[#6e6e73]">Ringkasan perubahan dari Employee Settings.</p>
              </div>
              <span className="w-fit rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                {profileLogs.length} update terakhir
              </span>
            </div>

            <div className="grid gap-3 p-5 lg:grid-cols-2 xl:grid-cols-3">
              {profileLogs.map((log) => <ProfileUpdateCard key={log.id} log={log} />)}
            </div>
          </div>
        )}

        {successMessage && <AlertBox type="success" message={successMessage} />}
        {errorMessage && <AlertBox type="error" message={`Error: ${errorMessage}`} />}

        <div className="harmony-card harmony-slide-up overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-[#1d1d1f]">Master Employee</h2>
              <p className="mt-1 text-sm text-[#6e6e73]">
                Homebase karyawan disimpan di departemen dan jabatan utama. Jabatan rangkap disimpan sebagai penugasan tambahan.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center">
              <button type="button" onClick={fetchEmployees} className="harmony-button-secondary">
                <RefreshCcw size={18} />
                Refresh
              </button>
              <button type="button" onClick={handleAddNew} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-[#007aff] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,122,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0067d8]">
                <UserPlus size={18} />
                Tambah Karyawan
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-black/5 bg-white/35 p-5 xl:grid-cols-[1fr_190px_220px_220px]">
            <div className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
              <Search size={18} className="shrink-0 text-[#6e6e73]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, NIP, PIN, email, unit, jabatan..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#86868b]"
              />
            </div>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="harmony-select">
              <option value="all">Semua Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="harmony-select">
              <option value="all">Semua Departemen</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>

            <select value={syncFilter} onChange={(event) => setSyncFilter(event.target.value)} className="harmony-select">
              <option value="all">Semua Sinkronisasi</option>
              <option value="updated_by_employee">Sudah Update Pribadi</option>
              <option value="not_updated">Belum Update Pribadi</option>
            </select>
          </div>

          {loading && <div className="p-6 text-sm text-[#6e6e73]">Loading data karyawan...</div>}

          {!loading && (
            <div className="space-y-3 p-5">
              {filteredEmployees.map((employee) => (
                <EmployeeCompactCard
                  key={employee.id}
                  employee={employee}
                  assignmentCount={assignments.filter((assignment) => assignment.employee_id === employee.id && assignment.is_active !== false).length}
                  onDetail={() => setSelectedEmployee(employee)}
                  onEdit={() => openEditModal(employee)}
                  onToggleActive={() => handleToggleActive(employee)}
                />
              ))}

              {filteredEmployees.length === 0 && (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
                    <Users size={24} />
                  </div>
                  <h3 className="mt-4 font-semibold text-[#1d1d1f]">Data karyawan tidak ditemukan</h3>
                  <p className="mt-1 text-sm text-[#6e6e73]">Coba ubah keyword pencarian, status, departemen, atau filter sinkronisasi.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedEmployee && (
          <EmployeeDetailModal
            employee={selectedEmployee}
            assignments={selectedEmployeeAssignments}
            employees={employees}
            onClose={() => setSelectedEmployee(null)}
            onEdit={() => openEditModal(selectedEmployee)}
          />
        )}

        {editModalOpen && (
          <EmployeeFormModal
            form={form}
            saving={saving}
            savingAssignment={savingAssignment}
            deletingAssignmentId={deletingAssignmentId}
            editingEmployeeId={editingEmployeeId}
            employees={employees}
            departmentOptions={departmentOptions}
            positionOptions={positionOptions}
            assignments={currentEmployeeAssignments}
            assignmentForm={assignmentForm}
            phlBalanceDetail={phlBalanceDetail}
            phlAdjustmentForm={phlAdjustmentForm}
            loadingPHLBalance={loadingPHLBalance}
            savingPHLAdjustment={savingPHLAdjustment}
            onSubmit={handleSubmit}
            onClose={resetForm}
            onUpdate={updateForm}
            onAssignmentUpdate={updateAssignmentForm}
            onPHLAdjustmentUpdate={updatePHLAdjustmentForm}
            onPHLAdjust={handlePHLBalanceAdjustment}
            onAddAssignment={handleAddAssignment}
            onDeleteAssignment={handleDeleteAssignment}
          />
        )}
      </section>
    </>
  )
}


function MasterOptionsLauncher({
  departmentCount,
  positionCount,
  selectedCount,
  onOpen,
}: {
  departmentCount: number
  positionCount: number
  selectedCount: number
  onOpen: () => void
}) {
  return (
    <div className="harmony-card overflow-hidden p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
            <GitBranch size={13} />
            Master Dropdown Organisasi
          </div>
          <h2 className="text-lg font-semibold text-[#1d1d1f]">
            Kelola Departemen & Jabatan
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
            Opsi dropdown dipindahkan ke modal supaya halaman data karyawan tetap ringkas.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
            <MiniStat label="Departemen" value={String(departmentCount)} />
            <MiniStat label="Jabatan" value={String(positionCount)} />
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-[#1d1d1f] px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-black"
          >
            <Pencil size={17} />
            Kelola Dropdown
            {selectedCount > 0 && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">
                {selectedCount} tercentang
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function MasterOptionsModal({
  departmentOptions,
  positionOptions,
  newDepartmentOption,
  newPositionOption,
  savingOptionType,
  deletingOptionId,
  bulkDeletingOptions,
  selectedOptionIds,
  onDepartmentChange,
  onPositionChange,
  onAdd,
  onDelete,
  onBulkDelete,
  onToggleSelection,
  onToggleAll,
  onClose,
}: {
  departmentOptions: MasterOption[]
  positionOptions: MasterOption[]
  newDepartmentOption: string
  newPositionOption: string
  savingOptionType: 'department' | 'position' | null
  deletingOptionId: string | null
  bulkDeletingOptions: boolean
  selectedOptionIds: string[]
  onDepartmentChange: (value: string) => void
  onPositionChange: (value: string) => void
  onAdd: (type: 'department' | 'position') => void
  onDelete: (option: MasterOption) => void
  onBulkDelete: () => void
  onToggleSelection: (optionId: string) => void
  onToggleAll: (options: MasterOption[]) => void
  onClose: () => void
}) {
  const totalSelected = selectedOptionIds.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex min-w-0 items-start justify-between gap-4 border-b border-black/5 p-6">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <GitBranch size={14} />
              Master Dropdown Organisasi
            </div>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              Departemen & Jabatan
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6e6e73]">
              Tambah opsi manual atau centang beberapa pilihan untuk menghapus sekaligus. Hapus di sini hanya menonaktifkan pilihan dropdown, bukan mengubah data karyawan lama.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-black/5 bg-[#f5f5f7]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1d1d1f] shadow-sm">
              {departmentOptions.length} departemen
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1d1d1f] shadow-sm">
              {positionOptions.length} jabatan
            </span>
            <span className="rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
              {totalSelected} pilihan dicentang
            </span>
          </div>

          <button
            type="button"
            onClick={onBulkDelete}
            disabled={totalSelected === 0 || bulkDeletingOptions}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} />
            {bulkDeletingOptions ? 'Menghapus...' : `Hapus Tercentang (${totalSelected})`}
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 xl:grid-cols-2">
          <OptionPanel
            title="Departemen"
            icon={<Building2 size={18} />}
            value={newDepartmentOption}
            options={departmentOptions}
            placeholder="Tambah departemen baru"
            saving={savingOptionType === 'department'}
            deletingOptionId={deletingOptionId}
            selectedOptionIds={selectedOptionIds}
            onChange={onDepartmentChange}
            onAdd={() => onAdd('department')}
            onDelete={onDelete}
            onToggleSelection={onToggleSelection}
            onToggleAll={() => onToggleAll(departmentOptions)}
          />

          <OptionPanel
            title="Jabatan"
            icon={<Briefcase size={18} />}
            value={newPositionOption}
            options={positionOptions}
            placeholder="Tambah jabatan baru"
            saving={savingOptionType === 'position'}
            deletingOptionId={deletingOptionId}
            selectedOptionIds={selectedOptionIds}
            onChange={onPositionChange}
            onAdd={() => onAdd('position')}
            onDelete={onDelete}
            onToggleSelection={onToggleSelection}
            onToggleAll={() => onToggleAll(positionOptions)}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="harmony-button-secondary">
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

function OptionPanel({
  title,
  icon,
  value,
  options,
  placeholder,
  saving,
  deletingOptionId,
  selectedOptionIds,
  onChange,
  onAdd,
  onDelete,
  onToggleSelection,
  onToggleAll,
}: {
  title: string
  icon: ReactNode
  value: string
  options: MasterOption[]
  placeholder: string
  saving: boolean
  deletingOptionId: string | null
  selectedOptionIds: string[]
  onChange: (value: string) => void
  onAdd: () => void
  onDelete: (option: MasterOption) => void
  onToggleSelection: (optionId: string) => void
  onToggleAll: () => void
}) {
  const allSelected = options.length > 0 && options.every((option) => selectedOptionIds.includes(option.id))
  const selectedCount = options.filter((option) => selectedOptionIds.includes(option.id)).length

  return (
    <div className="rounded-[28px] border border-black/5 bg-[#f5f5f7]/70 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white p-3 text-[#007aff] shadow-sm">{icon}</div>
          <div>
            <h3 className="font-semibold text-[#1d1d1f]">{title}</h3>
            <p className="text-xs text-[#6e6e73]">
              {selectedCount} dari {options.length} pilihan dicentang.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleAll}
          disabled={options.length === 0}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white px-3 text-xs font-bold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-md border border-[#007aff]/40 bg-white text-[10px] text-[#007aff]">
            {allSelected ? '✓' : ''}
          </span>
          {allSelected ? 'Batal Semua' : 'Centang Semua'}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="harmony-input"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={saving}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-4 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={16} />
          {saving ? 'Menyimpan...' : 'Tambah'}
        </button>
      </div>

      <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">
        {options.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#6e6e73]">
            Belum ada pilihan aktif.
          </div>
        ) : (
          options.map((option) => {
            const checked = selectedOptionIds.includes(option.id)

            return (
              <div
                key={option.id}
                className={[
                  'flex items-center gap-3 rounded-2xl border px-3 py-3 transition',
                  checked
                    ? 'border-[#007aff]/30 bg-[#e8f2ff]'
                    : 'border-black/5 bg-white hover:bg-[#f5f5f7]',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => onToggleSelection(option.id)}
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition',
                    checked
                      ? 'border-[#007aff] bg-[#007aff] text-white'
                      : 'border-[#007aff]/35 bg-white text-[#007aff]',
                  ].join(' ')}
                  title={checked ? 'Batalkan pilihan' : 'Centang pilihan'}
                >
                  {checked ? '✓' : ''}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleSelection(option.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block break-words text-sm font-bold text-[#1d1d1f]">
                    {option.option_value}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(option)}
                  disabled={deletingOptionId === option.id}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  title={`Hapus ${option.option_value}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[#1d1d1f]">
        {value}
      </p>
    </div>
  )
}

function EmployeeCompactCard({ employee, assignmentCount, onDetail, onEdit, onToggleActive }: { employee: Employee; assignmentCount: number; onDetail: () => void; onEdit: () => void; onToggleActive: () => void }) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_270px_260px_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-sm font-bold text-white shadow-sm">
            {getInitials(employee.full_name || '-')}
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="max-w-full truncate text-base font-semibold text-[#1d1d1f]">{employee.full_name || '-'}</h3>
              <StatusBadge active={employee.is_active !== false} />
              {assignmentCount > 0 && <span className="shrink-0 rounded-full bg-[#f7edfc] px-2.5 py-1 text-[11px] font-bold text-[#7b2cbf]">{assignmentCount} rangkap</span>}
              {employee.personal_updated_at && <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">Personal updated</span>}
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#6e6e73]">
              <span className="max-w-[120px] truncate">{employee.employee_number || '-'}</span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-[#c7c7cc]" />
              <span className="max-w-[120px] truncate">{formatEmploymentStatus(employee.employment_status)}</span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-[#c7c7cc]" />
              <span className="max-w-[240px] truncate">{employee.email || '-'}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl bg-[#f5f5f7]/80 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">Homebase Utama</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#1d1d1f]">{employee.department || '-'}</p>
          <p className="mt-1 break-words text-xs text-[#6e6e73]">{employee.position || '-'}</p>
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          <SmallBadge icon={<Fingerprint size={13} />} label={employee.machine_pin || '-'} />
          <SmallBadge icon={<WalletCards size={13} />} label={`Cuti ${employee.annual_leave_balance || 0}`} />
          <SmallBadge icon={<WalletCards size={13} />} label={`PHL ${employee.phl_balance || 0}`} />
        </div>

        <div className="flex shrink-0 flex-wrap justify-start gap-2 xl:justify-end">
          <button type="button" onClick={onDetail} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8] transition hover:bg-blue-100">
            <Eye size={15} />
            Detail
          </button>
          <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white px-4 text-xs font-bold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7]">
            <Pencil size={15} />
            Edit
          </button>
          <button type="button" onClick={onToggleActive} className={['flex h-9 w-9 items-center justify-center rounded-2xl transition', employee.is_active === false ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'].join(' ')}>
            <Power size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EmployeeDetailModal({ employee, assignments, employees, onClose, onEdit }: { employee: Employee; assignments: EmployeeAssignment[]; employees: Employee[]; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex min-w-0 items-start justify-between gap-4 border-b border-black/5 p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#1d1d1f] text-base font-bold text-white">
              {getInitials(employee.full_name || '-')}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-[#1d1d1f]">{employee.full_name || '-'}</h2>
              <p className="mt-1 truncate text-sm text-[#6e6e73]">{employee.employee_number || '-'} · {employee.department || '-'} · {employee.position || '-'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]">
            <X size={18} />
          </button>
        </div>

        <div className="min-w-0 overflow-y-auto p-6">
          <div className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
            <DetailSection title="Identitas" icon={<UserRound size={18} />}>
              <DetailItem label="Nama" value={employee.full_name} />
              <DetailItem label="NIP / Employee Number" value={employee.employee_number} />
              <DetailItem label="Machine PIN" value={employee.machine_pin} />
              <DetailItem label="Gender" value={formatGender(employee.gender)} />
              <DetailItem label="Employment Status" value={formatEmploymentStatus(employee.employment_status)} />
              <DetailItem label="Status Data" value={employee.is_active === false ? 'Inactive' : 'Active'} />
            </DetailSection>

            <DetailSection title="Homebase Utama" icon={<Building2 size={18} />}>
              <DetailItem label="Departemen Utama" value={employee.department} />
              <DetailItem label="Jabatan Utama" value={employee.position} />
              <DetailItem label="Join Date" value={formatDisplayDate(employee.join_date || '')} />
              <DetailItem label="Atasan 1" value={getSupervisorLabel(employee.supervisor_1, employees)} />
              <DetailItem label="Atasan 2" value={getSupervisorLabel(employee.supervisor_2, employees)} />
              <DetailItem label="Update Terakhir" value={formatDateTime(employee.updated_at || '')} />
            </DetailSection>

            <DetailSection title="Kontak" icon={<Mail size={18} />}>
              <DetailItem label="Email" value={employee.email} />
              <DetailItem label="Nomor HP Utama" value={employee.phone} />
              <DetailItem label="No. HP Pribadi" value={employee.personal_phone} />
              <DetailItem label="Kontak Darurat" value={employee.emergency_contact_name} />
              <DetailItem label="No. Kontak Darurat" value={employee.emergency_contact_phone} />
              <DetailItem label="Personal Updated" value={formatDateTime(employee.personal_updated_at || '')} />
            </DetailSection>

            <DetailSection title="Jabatan & Penugasan Tambahan" icon={<Briefcase size={18} />} wide>
              {assignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-white p-5 text-sm font-semibold text-[#6e6e73]">
                  Belum ada jabatan rangkap atau penugasan tambahan aktif.
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <AssignmentDetailCard key={assignment.id} assignment={assignment} employees={employees} />
                  ))}
                </div>
              )}
            </DetailSection>

            <DetailSection title="Alamat Domisili" icon={<MapPin size={18} />} wide>
              <DetailItem label="Alamat" value={employee.address} long />
            </DetailSection>

            <DetailSection title="Saldo" icon={<WalletCards size={18} />}>
              <DetailItem label="Saldo Cuti Tahunan" value={`${employee.annual_leave_balance || 0} hari`} />
              <DetailItem label="Saldo PHL" value={`${employee.phl_balance || 0} hari`} />
            </DetailSection>

            <DetailSection title="Audit Sinkronisasi" icon={<Clock3 size={18} />}>
              <DetailItem label="Personal Updated By" value={employee.personal_updated_by} />
              <DetailItem label="Personal Updated At" value={formatDateTime(employee.personal_updated_at || '')} />
              <DetailItem label="Created At" value={formatDateTime(employee.created_at || '')} />
              <DetailItem label="Updated At" value={formatDateTime(employee.updated_at || '')} />
            </DetailSection>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 p-6 md:flex-row md:justify-end">
          <button type="button" onClick={onClose} className="harmony-button-secondary">Tutup</button>
          <button type="button" onClick={onEdit} className="harmony-button-primary">
            <Pencil size={18} />
            Edit Data
          </button>
        </div>
      </div>
    </div>
  )
}

function EmployeeFormModal({
  form,
  saving,
  savingAssignment,
  deletingAssignmentId,
  editingEmployeeId,
  employees,
  departmentOptions,
  positionOptions,
  assignments,
  assignmentForm,
  phlBalanceDetail,
  phlAdjustmentForm,
  loadingPHLBalance,
  savingPHLAdjustment,
  onSubmit,
  onClose,
  onUpdate,
  onAssignmentUpdate,
  onPHLAdjustmentUpdate,
  onPHLAdjust,
  onAddAssignment,
  onDeleteAssignment,
}: {
  form: EmployeeForm
  saving: boolean
  savingAssignment: boolean
  deletingAssignmentId: string | null
  editingEmployeeId: string | null
  employees: Employee[]
  departmentOptions: string[]
  positionOptions: string[]
  assignments: EmployeeAssignment[]
  assignmentForm: AssignmentForm
  phlBalanceDetail: PHLBalanceDetail | null
  phlAdjustmentForm: PHLAdjustmentForm
  loadingPHLBalance: boolean
  savingPHLAdjustment: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
  onUpdate: (field: keyof EmployeeForm, value: string | number | boolean) => void
  onAssignmentUpdate: (field: keyof AssignmentForm, value: string) => void
  onPHLAdjustmentUpdate: <K extends keyof PHLAdjustmentForm>(
    field: K,
    value: PHLAdjustmentForm[K]
  ) => void
  onPHLAdjust: () => void
  onAddAssignment: () => void
  onDeleteAssignment: (assignment: EmployeeAssignment) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex min-w-0 items-start justify-between gap-4 border-b border-black/5 p-6">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <Sparkles size={14} />
              Employee Master
            </div>
            <h2 className="truncate text-xl font-semibold text-[#1d1d1f]">{editingEmployeeId ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</h2>
            <p className="mt-1 text-sm text-[#6e6e73]">Homebase utama dipisahkan dari jabatan rangkap agar struktur organisasi tetap rapi.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-6 overflow-y-auto p-6">
            <FormSection title="Identitas Karyawan" description="Data utama untuk pencarian, user account, dan mapping employee." icon={<Users size={18} />}>
              <InputField label="Employee Number" value={form.employee_number} onChange={(value) => onUpdate('employee_number', value)} placeholder="Contoh: EMP001" required />
              <InputField label="Machine PIN" value={form.machine_pin} onChange={(value) => onUpdate('machine_pin', value)} placeholder="PIN dari mesin fingerprint" required />
              <InputField label="Nama Lengkap" value={form.full_name} onChange={(value) => onUpdate('full_name', value)} placeholder="Nama karyawan" required />
              <InputField label="Email" type="email" value={form.email} onChange={(value) => onUpdate('email', value)} placeholder="email@company.com" />
              <InputField label="Nomor HP Kantor/Utama" value={form.phone} onChange={(value) => onUpdate('phone', value)} placeholder="08xxxxxxxxxx" />
              <SelectField label="Gender" value={form.gender} onChange={(value) => onUpdate('gender', value)} options={[{ label: 'Semua / Tidak diset', value: 'all' }, { label: 'Laki-laki', value: 'male' }, { label: 'Perempuan', value: 'female' }]} />
            </FormSection>

            <FormSection title="Homebase Utama & Status" description="Departemen dan jabatan utama dipakai untuk identitas HR, absensi, cuti, dan pelaporan utama." icon={<Building2 size={18} />}>
              <OrganizationOptionField
                label="Departemen Utama"
                value={form.department}
                options={departmentOptions}
                onChange={(value) => onUpdate('department', value)}
                otherPlaceholder="Isi departemen utama secara manual"
              />
              <OrganizationOptionField
                label="Jabatan Utama"
                value={form.position}
                options={positionOptions}
                onChange={(value) => onUpdate('position', value)}
                otherPlaceholder="Isi jabatan utama secara manual"
              />
              <InputField label="Join Date" type="date" value={form.join_date} onChange={(value) => onUpdate('join_date', value)} />
              <SelectField label="Employment Status" value={form.employment_status} onChange={(value) => onUpdate('employment_status', value)} options={[{ label: 'Active', value: 'active' }, { label: 'Probation', value: 'probation' }, { label: 'Contract', value: 'contract' }, { label: 'Permanent', value: 'permanent' }, { label: 'Resigned', value: 'resigned' }, { label: 'Inactive', value: 'inactive' }]} />
              <SupervisorSelectField label="Atasan 1" value={form.supervisor_1} employees={employees} currentEmployeeId={editingEmployeeId} onChange={(value) => onUpdate('supervisor_1', value)} />
              <SupervisorSelectField label="Atasan 2" value={form.supervisor_2} employees={employees} currentEmployeeId={editingEmployeeId} onChange={(value) => onUpdate('supervisor_2', value)} />
            </FormSection>

            <AssignmentSection
              editingEmployeeId={editingEmployeeId}
              assignments={assignments}
              employees={employees}
              departmentOptions={departmentOptions}
              positionOptions={positionOptions}
              form={assignmentForm}
              saving={savingAssignment}
              deletingAssignmentId={deletingAssignmentId}
              onUpdate={onAssignmentUpdate}
              onAdd={onAddAssignment}
              onDelete={onDeleteAssignment}
            />

            <FormSection title="Data Pribadi Tersinkron" description="Data ini dapat diperbarui oleh employee dari Employee Settings, dan juga dapat dikoreksi oleh HR." icon={<HeartHandshake size={18} />}>
              <InputField label="No. HP Pribadi" value={form.personal_phone} onChange={(value) => onUpdate('personal_phone', value)} placeholder="No. HP pribadi" />
              <InputField label="Nama Kontak Darurat" value={form.emergency_contact_name} onChange={(value) => onUpdate('emergency_contact_name', value)} placeholder="Nama keluarga / wali" />
              <InputField label="No. Kontak Darurat" value={form.emergency_contact_phone} onChange={(value) => onUpdate('emergency_contact_phone', value)} placeholder="No. kontak darurat" />
              <TextareaField label="Alamat Domisili" value={form.address} onChange={(value) => onUpdate('address', value)} placeholder="Alamat domisili karyawan" />
            </FormSection>

            <FormSection title="Saldo & Status Data" description="Saldo cuti tahunan dapat dikoreksi pada data utama. Saldo PHL dikelola melalui ledger bertanggal di bagian berikutnya." icon={<WalletCards size={18} />}>
              <InputField label="Saldo Cuti Tahunan" type="number" value={String(form.annual_leave_balance)} onChange={(value) => onUpdate('annual_leave_balance', Number(value))} />
              <ReadOnlyBalanceField
                label="Saldo PHL Aktif"
                value={
                  loadingPHLBalance
                    ? 'Memuat...'
                    : `${Number(phlBalanceDetail?.active_balance ?? form.phl_balance ?? 0)} hari`
                }
                description="Tidak dapat diedit langsung. Gunakan Penyesuaian Saldo PHL agar tanggal dan audit tersimpan."
              />
              <SelectField label="Status Data" value={form.is_active ? 'active' : 'inactive'} onChange={(value) => onUpdate('is_active', value === 'active')} options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]} />
            </FormSection>

            <PHLBalanceAdjustmentSection
              editingEmployeeId={editingEmployeeId}
              detail={phlBalanceDetail}
              fallbackBalance={Number(form.phl_balance || 0)}
              form={phlAdjustmentForm}
              loading={loadingPHLBalance}
              saving={savingPHLAdjustment}
              onUpdate={onPHLAdjustmentUpdate}
              onAdjust={onPHLAdjust}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-black/5 p-6 md:flex-row md:justify-end">
            <button type="button" onClick={onClose} className="harmony-button-secondary">Batal</button>
            <button type="submit" disabled={saving} className="harmony-button-primary">
              <Save size={18} />
              {saving ? 'Menyimpan...' : editingEmployeeId ? 'Update Data Utama' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function ReadOnlyBalanceField({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-[#f5f5f7] p-4">
      <span className="harmony-label">{label}</span>
      <div className="mt-1 text-lg font-bold text-[#1d1d1f]">{value}</div>
      <p className="mt-1 text-xs leading-5 text-[#6e6e73]">{description}</p>
    </div>
  )
}

function PHLBalanceAdjustmentSection({
  editingEmployeeId,
  detail,
  fallbackBalance,
  form,
  loading,
  saving,
  onUpdate,
  onAdjust,
}: {
  editingEmployeeId: string | null
  detail: PHLBalanceDetail | null
  fallbackBalance: number
  form: PHLAdjustmentForm
  loading: boolean
  saving: boolean
  onUpdate: <K extends keyof PHLAdjustmentForm>(
    field: K,
    value: PHLAdjustmentForm[K]
  ) => void
  onAdjust: () => void
}) {
  const calculatedExpiry =
    form.action === 'add' && form.phl_date
      ? addDaysISO(form.phl_date, 90)
      : ''

  const displayedAvailableBalance = Number(
    detail?.active_balance ?? fallbackBalance ?? 0
  )

  return (
    <div className="rounded-[28px] border border-[#d6e8ff] bg-gradient-to-br from-[#f8fbff] to-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-black/5 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#0059b8]">
            <CalendarClock size={19} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[#1d1d1f]">Penyesuaian Saldo PHL</h3>
            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Setiap saldo tambahan wajib memiliki tanggal pelaksanaan. Masa berlaku otomatis 90 hari. Pengurangan mengambil saldo yang paling cepat expired.
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
          <ShieldCheck size={14} />
          Ledger & Audit Aktif
        </div>
      </div>

      {!editingEmployeeId ? (
        <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-700">
          Simpan karyawan terlebih dahulu. Setelah itu buka kembali Edit Data untuk menambahkan atau mengurangi saldo PHL.
        </div>
      ) : loading ? (
        <div className="mt-5 flex min-h-32 items-center justify-center gap-3 rounded-[22px] border border-black/5 bg-white">
          <Loader2 size={20} className="animate-spin text-[#007aff]" />
          <span className="text-sm font-semibold text-[#6e6e73]">Memuat ledger PHL...</span>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <PHLSummaryMiniCard
              title="Saldo PHL Tersedia"
              value={`${displayedAvailableBalance} hari`}
              description="Saldo aktif yang dapat digunakan"
            />
            <PHLSummaryMiniCard
              title="Ledger Bertanggal"
              value={`${Number(detail?.active_ledger_balance || 0)} hari`}
              description="Memiliki expiry"
            />
            <PHLSummaryMiniCard
              title="Saldo Legacy"
              value={`${Number(detail?.legacy_balance || 0)} hari`}
              description="Belum bertanggal"
            />
            <PHLSummaryMiniCard
              title="Expired Tersisa"
              value={`${Number(detail?.expired_balance || 0)} hari`}
              description="Tidak dapat digunakan"
            />
            <PHLSummaryMiniCard
              title="Expired ≤30 Hari"
              value={`${Number(detail?.expiring_30_days || 0)} hari`}
              description={
                detail?.next_expiry
                  ? `Terdekat ${formatDate(detail.next_expiry)}`
                  : 'Tidak ada'
              }
            />
          </div>

          <div className="mt-5 rounded-[24px] border border-[#b9dcff] bg-[#f3f9ff] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#5f6b7a]">
                  Saldo PHL Tersedia Saat Ini
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-[#0059b8]">
                  {displayedAvailableBalance} hari
                </p>
              </div>
              <p className="max-w-xl text-xs leading-5 text-[#6e6e73]">
                Nilai ini berasal dari saldo PHL aktif yang belum expired ditambah saldo legacy yang masih tersedia.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-black/5 bg-white p-5">
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="Jenis Penyesuaian"
                value={form.action}
                onChange={(value) =>
                  onUpdate('action', value as 'add' | 'subtract')
                }
                options={[
                  { label: 'Tambah Saldo PHL', value: 'add' },
                  { label: 'Kurangi Saldo PHL', value: 'subtract' },
                ]}
              />

              <InputField
                label="Jumlah Hari"
                type="number"
                value={String(form.days)}
                onChange={(value) => onUpdate('days', Number(value))}
                placeholder="Contoh: 1"
              />

              {form.action === 'add' ? (
                <InputField
                  label="Tanggal PHL Dilaksanakan"
                  type="date"
                  value={form.phl_date}
                  onChange={(value) => onUpdate('phl_date', value)}
                />
              ) : (
                <ReadOnlyBalanceField
                  label="Metode Pengurangan"
                  value="FIFO Expiry"
                  description="Saldo terdekat expired dipotong terlebih dahulu."
                />
              )}

              {form.action === 'add' ? (
                <ReadOnlyBalanceField
                  label="Tanggal Expired Otomatis"
                  value={calculatedExpiry ? formatDate(calculatedExpiry) : '-'}
                  description="Tanggal pelaksanaan + 90 hari."
                />
              ) : (
                <ReadOnlyBalanceField
                  label="Saldo Maksimal Dikurangi"
                  value={`${displayedAvailableBalance} hari`}
                  description="Saldo tidak boleh menjadi minus."
                />
              )}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <TextareaField
                label="Keterangan Saldo PHL"
                value={form.description}
                onChange={(value) => onUpdate('description', value)}
                placeholder={
                  form.action === 'add'
                    ? 'Contoh: Bertugas pada kegiatan Job Fair hari Minggu.'
                    : 'Contoh: Koreksi saldo PHL yang tercatat ganda.'
                }
              />

              <TextareaField
                label="Alasan Penyesuaian HR"
                value={form.reason}
                onChange={(value) => onUpdate('reason', value)}
                placeholder={
                  form.action === 'add'
                    ? 'Contoh: Penambahan berdasarkan surat tugas / bukti pelaksanaan kerja.'
                    : 'Contoh: Pengurangan karena koreksi data ganda.'
                }
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onAdjust}
                disabled={
                  saving ||
                  Number(form.days || 0) <= 0 ||
                  form.reason.trim().length < 5 ||
                  (form.action === 'add' && form.description.trim().length < 3) ||
                  (form.action === 'add' && !form.phl_date)
                }
                className={[
                  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50',
                  form.action === 'add'
                    ? 'bg-[#007aff] hover:bg-[#0067d8]'
                    : 'bg-orange-600 hover:bg-orange-700',
                ].join(' ')}
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : form.action === 'add' ? (
                  <Plus size={17} />
                ) : (
                  <Minus size={17} />
                )}
                {saving
                  ? 'Memproses...'
                  : form.action === 'add'
                    ? 'Tambahkan Saldo PHL'
                    : 'Kurangi Saldo PHL'}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <PHLLotHistory lots={detail?.lots || []} />
            <PHLAdjustmentHistory adjustments={detail?.adjustments || []} />
          </div>
        </>
      )}
    </div>
  )
}

function PHLSummaryMiniCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#86868b]">
        {title}
      </div>
      <div className="mt-2 text-xl font-bold text-[#1d1d1f]">{value}</div>
      <div className="mt-1 text-xs text-[#6e6e73]">{description}</div>
    </div>
  )
}

function PHLLotHistory({ lots }: { lots: PHLBalanceLot[] }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white">
      <div className="flex items-center gap-3 border-b border-black/5 p-4">
        <CalendarClock size={17} className="text-[#007aff]" />
        <div>
          <h4 className="text-sm font-bold text-[#1d1d1f]">Saldo Berdasarkan Tanggal PHL</h4>
          <p className="mt-0.5 text-xs text-[#6e6e73]">Maksimal 50 lot terbaru.</p>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {lots.length === 0 ? (
          <div className="p-5 text-sm text-[#6e6e73]">Belum ada saldo PHL bertanggal.</div>
        ) : (
          <div className="divide-y divide-black/5">
            {lots.map((lot) => (
              <div key={lot.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="font-semibold text-[#1d1d1f]">
                    PHL {formatDate(lot.phl_date)}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-[#6e6e73]">
                    {lot.description || lot.reason || lot.notes || 'Saldo PHL'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="rounded-full bg-[#e8f2ff] px-2.5 py-1 text-[#0059b8]">
                      Total {Number(lot.balance_days || 0)}
                    </span>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">
                      Terpakai {Number(lot.used_days || 0)}
                    </span>
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">
                      Sisa {Number(lot.remaining_days || 0)}
                    </span>
                  </div>
                </div>

                <div className="sm:text-right">
                  <div
                    className={[
                      'inline-flex rounded-full px-3 py-1 text-[11px] font-bold',
                      lot.is_expired
                        ? 'bg-red-50 text-red-700'
                        : Number(lot.days_to_expiry ?? 999) <= 30
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-green-50 text-green-700',
                    ].join(' ')}
                  >
                    {lot.is_expired
                      ? 'Expired'
                      : lot.days_to_expiry === null
                        ? 'Tanpa expired'
                        : `${lot.days_to_expiry} hari lagi`}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[#6e6e73]">
                    Expired {formatDate(lot.expired_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PHLAdjustmentHistory({
  adjustments,
}: {
  adjustments: PHLAdjustmentLog[]
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white">
      <div className="flex items-center gap-3 border-b border-black/5 p-4">
        <History size={17} className="text-[#7b2cbf]" />
        <div>
          <h4 className="text-sm font-bold text-[#1d1d1f]">Riwayat Penyesuaian HR</h4>
          <p className="mt-0.5 text-xs text-[#6e6e73]">Maksimal 30 transaksi terbaru.</p>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {adjustments.length === 0 ? (
          <div className="p-5 text-sm text-[#6e6e73]">Belum ada penyesuaian saldo oleh HR.</div>
        ) : (
          <div className="divide-y divide-black/5">
            {adjustments.map((adjustment) => (
              <div key={adjustment.id} className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          'rounded-full px-3 py-1 text-[11px] font-bold',
                          adjustment.action === 'add'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-orange-50 text-orange-700',
                        ].join(' ')}
                      >
                        {adjustment.action === 'add' ? 'Tambah' : 'Kurangi'}{' '}
                        {Number(adjustment.days || 0)} hari
                      </span>
                      <span className="text-xs font-semibold text-[#6e6e73]">
                        {adjustment.created_at ? formatDateTime(adjustment.created_at) : '-'}
                      </span>
                    </div>
                    {adjustment.description && (
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#1d1d1f]">
                        {adjustment.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
                      Alasan HR: {adjustment.reason || '-'}
                    </p>
                    <p className="mt-1 text-xs text-[#6e6e73]">
                      Oleh {adjustment.actor_email || 'HR Administrator'}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-[#f5f5f7] px-3 py-2 text-xs font-bold text-[#1d1d1f]">
                    {Number(adjustment.balance_before || 0)} →{' '}
                    {Number(adjustment.balance_after || 0)} hari
                  </div>
                </div>

                {adjustment.action === 'add' && (
                  <div className="mt-2 text-xs font-semibold text-[#6e6e73]">
                    PHL {formatDate(adjustment.phl_date)} · Expired{' '}
                    {formatDate(adjustment.expired_at)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AssignmentSection({
  editingEmployeeId,
  assignments,
  employees,
  departmentOptions,
  positionOptions,
  form,
  saving,
  deletingAssignmentId,
  onUpdate,
  onAdd,
  onDelete,
}: {
  editingEmployeeId: string | null
  assignments: EmployeeAssignment[]
  employees: Employee[]
  departmentOptions: string[]
  positionOptions: string[]
  form: AssignmentForm
  saving: boolean
  deletingAssignmentId: string | null
  onUpdate: (field: keyof AssignmentForm, value: string) => void
  onAdd: () => void
  onDelete: (assignment: EmployeeAssignment) => void
}) {
  return (
    <div className="rounded-[26px] border border-black/5 bg-white/60 p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-[#f7edfc] p-3 text-[#7b2cbf]"><Briefcase size={18} /></div>
        <div className="min-w-0">
          <h3 className="font-semibold text-[#1d1d1f]">Jabatan & Penugasan Tambahan</h3>
          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
            Gunakan ini untuk dosen yang merangkap kepala unit, staf unit, koordinator, atau jabatan struktural tambahan. Data utama karyawan tetap menjadi homebase.
          </p>
        </div>
      </div>

      {!editingEmployeeId ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-700">
          Simpan data karyawan terlebih dahulu. Setelah data tersimpan, buka kembali Edit Data untuk menambahkan jabatan rangkap.
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h4 className="mb-3 text-sm font-bold text-[#1d1d1f]">Penugasan Aktif</h4>
            {assignments.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-5 text-sm font-semibold text-[#6e6e73]">
                Belum ada penugasan tambahan untuk karyawan ini.
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {assignments.map((assignment) => (
                  <AssignmentManageCard
                    key={assignment.id}
                    assignment={assignment}
                    employees={employees}
                    deleting={deletingAssignmentId === assignment.id}
                    onDelete={() => onDelete(assignment)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-black/5 bg-[#f5f5f7]/80 p-4">
            <h4 className="mb-4 text-sm font-bold text-[#1d1d1f]">Tambah Penugasan Baru</h4>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <OrganizationOptionField
                label="Departemen Penugasan"
                value={form.assignment_department}
                options={departmentOptions}
                onChange={(value) => onUpdate('assignment_department', value)}
                otherPlaceholder="Isi departemen penugasan"
              />
              <OrganizationOptionField
                label="Jabatan Penugasan"
                value={form.assignment_position}
                options={positionOptions}
                onChange={(value) => onUpdate('assignment_position', value)}
                otherPlaceholder="Isi jabatan penugasan"
              />
              <SelectField label="Jenis Penugasan" value={form.assignment_type} onChange={(value) => onUpdate('assignment_type', value)} options={assignmentTypeOptions} />
              <SupervisorSelectField label="Atasan Penugasan 1" value={form.supervisor_1} employees={employees} currentEmployeeId={editingEmployeeId} onChange={(value) => onUpdate('supervisor_1', value)} />
              <SupervisorSelectField label="Atasan Penugasan 2" value={form.supervisor_2} employees={employees} currentEmployeeId={editingEmployeeId} onChange={(value) => onUpdate('supervisor_2', value)} />
              <InputField label="Tanggal Mulai" type="date" value={form.start_date} onChange={(value) => onUpdate('start_date', value)} />
              <InputField label="Tanggal Berakhir" type="date" value={form.end_date} onChange={(value) => onUpdate('end_date', value)} />
              <TextareaField label="Catatan Penugasan" value={form.notes} onChange={(value) => onUpdate('notes', value)} placeholder="Contoh: Merangkap sebagai Kepala Unit Kerja Sama berdasarkan SK penugasan." />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onAdd}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#7b2cbf] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#6823a0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={17} />
                {saving ? 'Menyimpan...' : 'Tambah Penugasan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AssignmentManageCard({ assignment, employees, deleting, onDelete }: { assignment: EmployeeAssignment; employees: Employee[]; deleting: boolean; onDelete: () => void }) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[#f7edfc] px-3 py-1 text-[11px] font-bold text-[#7b2cbf]">
            {formatAssignmentType(assignment.assignment_type)}
          </span>
          <h4 className="mt-3 break-words text-sm font-bold text-[#1d1d1f]">{assignment.assignment_position || '-'}</h4>
          <p className="mt-1 break-words text-xs font-semibold text-[#6e6e73]">{assignment.assignment_department || '-'}</p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[#6e6e73]">
        <p><strong>Atasan 1:</strong> {getSupervisorLabel(assignment.supervisor_1, employees)}</p>
        <p><strong>Atasan 2:</strong> {getSupervisorLabel(assignment.supervisor_2, employees)}</p>
        <p><strong>Periode:</strong> {formatDisplayDate(assignment.start_date || '')} - {assignment.end_date ? formatDisplayDate(assignment.end_date) : 'Aktif'}</p>
        {assignment.notes && <p className="leading-5"><strong>Catatan:</strong> {assignment.notes}</p>}
      </div>
    </div>
  )
}

function AssignmentDetailCard({ assignment, employees }: { assignment: EmployeeAssignment; employees: Employee[] }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[#f7edfc] px-3 py-1 text-[11px] font-bold text-[#7b2cbf]">
            {formatAssignmentType(assignment.assignment_type)}
          </span>
          <h4 className="mt-3 break-words text-sm font-bold text-[#1d1d1f]">{assignment.assignment_position || '-'}</h4>
          <p className="mt-1 break-words text-xs font-semibold text-[#6e6e73]">{assignment.assignment_department || '-'}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] px-4 py-3 text-xs font-semibold text-[#6e6e73]">
          {formatDisplayDate(assignment.start_date || '')} - {assignment.end_date ? formatDisplayDate(assignment.end_date) : 'Aktif'}
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[#6e6e73] sm:grid-cols-2">
        <p><strong>Atasan 1:</strong> {getSupervisorLabel(assignment.supervisor_1, employees)}</p>
        <p><strong>Atasan 2:</strong> {getSupervisorLabel(assignment.supervisor_2, employees)}</p>
      </div>
      {assignment.notes && <p className="mt-3 text-xs leading-5 text-[#6e6e73]"><strong>Catatan:</strong> {assignment.notes}</p>}
    </div>
  )
}

function ProfileUpdateCard({ log }: { log: ProfileUpdateLog }) {
  return (
    <div className="min-w-0 rounded-[24px] border border-black/5 bg-[#f5f5f7]/70 p-4 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white">{getInitials(log.full_name || '-')}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#1d1d1f]">{log.full_name || '-'}</p>
          <p className="mt-1 truncate text-xs text-[#6e6e73]">{log.employee_number || '-'} · {log.email || '-'}</p>
          <p className="mt-2 text-xs font-semibold text-[#007aff]">{formatDateTime(log.created_at || '')}</p>
        </div>
      </div>
    </div>
  )
}

function FormSection({ title, description, icon, children }: { title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[26px] border border-black/5 bg-white/60 p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">{icon}</div>
        <div className="min-w-0">
          <h3 className="font-semibold text-[#1d1d1f]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  )
}

function DetailSection({ title, icon, children, wide = false }: { title: string; icon: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-[26px] border border-black/5 bg-[#f5f5f7]/70 p-5 ${wide ? 'xl:col-span-2 2xl:col-span-2' : ''}`}>
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <div className="shrink-0 rounded-2xl bg-white p-2 text-[#007aff] shadow-sm">{icon}</div>
        <h3 className="truncate font-semibold text-[#1d1d1f]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function DetailItem({ label, value, long = false }: { label: string; value?: string | number | null; long?: boolean }) {
  return (
    <div className={long ? 'min-w-0 rounded-2xl bg-white p-4' : 'grid min-w-0 grid-cols-1 gap-1.5 rounded-2xl bg-white px-4 py-3 sm:grid-cols-[145px_minmax(0,1fr)] sm:items-start sm:gap-4'}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>

      <p className={`${long ? 'mt-2 text-left leading-6' : 'text-left sm:text-right'} min-w-0 break-words text-sm font-semibold leading-6 text-[#1d1d1f]`}>
        {value || '-'}
      </p>
    </div>
  )
}

function SummaryCard({ title, value, description, icon, tone }: { title: string; value: string; description: string; icon: ReactNode; tone: 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'red' | 'indigo' }) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
    cyan: 'text-[#0077a3] bg-[#e8f8ff]',
    red: 'text-red-700 bg-red-50',
    indigo: 'text-indigo-700 bg-indigo-50',
  }[tone]

  return (
    <div className="harmony-card harmony-hover-lift harmony-slide-up min-w-0 p-5">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold leading-5 text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 break-words text-3xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-1 break-words text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function SmallBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#1d1d1f] ring-1 ring-black/5">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block min-w-0">
      <span className="harmony-label">{label}</span>
      <input type={type} value={value} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="harmony-input" />
    </label>
  )
}

function TextareaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block min-w-0 xl:col-span-3">
      <span className="harmony-label">{label}</span>
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="harmony-textarea" />
    </label>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { label: string; value: string }[] }) {
  return (
    <label className="block min-w-0">
      <span className="harmony-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="harmony-select">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function OrganizationOptionField({ label, value, options, onChange, otherPlaceholder }: { label: string; value: string; options: string[]; onChange: (value: string) => void; otherPlaceholder: string }) {
  const hasValueInOptions = options.some((option) => normalizeText(option) === normalizeText(value))
  const selectValue = !value ? '' : hasValueInOptions ? value : '__other__'
  const showManualInput = selectValue === '__other__'

  return (
    <div className="block min-w-0">
      <span className="harmony-label">{label}</span>
      <select
        value={selectValue}
        onChange={(event) => {
          const nextValue = event.target.value
          if (nextValue === '__other__') {
            onChange(hasValueInOptions ? '' : value)
            return
          }
          onChange(nextValue)
        }}
        className="harmony-select"
      >
        <option value="">Pilih {label}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="__other__">Lainnya / Isi manual</option>
      </select>

      {showManualInput && (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={otherPlaceholder}
          className="mt-2 harmony-input"
        />
      )}
    </div>
  )
}

function SupervisorSelectField({ label, value, employees, currentEmployeeId, onChange }: { label: string; value: string; employees: Employee[]; currentEmployeeId: string | null; onChange: (value: string) => void }) {
  const selectableEmployees = employees
    .filter((employee) => employee.is_active !== false)
    .filter((employee) => employee.id !== currentEmployeeId)

  const matchedSupervisor = findSupervisor(value, employees)
  const selectValue = !value ? '' : matchedSupervisor ? matchedSupervisor.id : '__legacy__'

  return (
    <label className="block min-w-0">
      <span className="harmony-label">{label}</span>
      <select
        value={selectValue}
        onChange={(event) => {
          const nextValue = event.target.value
          if (nextValue === '__legacy__') return
          onChange(nextValue)
        }}
        className="harmony-select"
      >
        <option value="">Tidak ada atasan</option>
        {selectableEmployees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.full_name || employee.email || employee.employee_number || employee.id} · {employee.department || '-'}
          </option>
        ))}
        {value && !matchedSupervisor && (
          <option value="__legacy__">Data lama: {value}</option>
        )}
      </select>
      {value && !matchedSupervisor && (
        <p className="mt-2 text-xs font-semibold leading-5 text-amber-700">
          Data atasan lama belum cocok dengan employee aktif. Pilih ulang dari dropdown agar relasi lebih aman.
        </p>
      )}
    </label>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={['inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-bold', active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'].join(' ')}>{active ? 'Active' : 'Inactive'}</span>
}

function AlertBox({ type, message }: { type: 'success' | 'error'; message: string }) {
  const className = type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600'
  return <div className={`rounded-2xl border p-4 text-sm ${className}`}>{message}</div>
}


function getTodayISO() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDaysISO(dateText: string, days: number) {
  if (!dateText) return ''

  const date = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''

  date.setDate(date.getDate() + days)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'

  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}


function daysBetweenISO(start: string, end: string) {
  if (!start || !end) return 0

  const startDate = new Date(`${start.slice(0, 10)}T00:00:00`)
  const endDate = new Date(`${end.slice(0, 10)}T00:00:00`)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0
  }

  return Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )
}

function employeeToForm(employee: Employee): EmployeeForm {
  return {
    employee_number: employee.employee_number || '',
    machine_pin: employee.machine_pin || '',
    full_name: employee.full_name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    gender: employee.gender || 'all',
    department: employee.department || '',
    position: employee.position || '',
    join_date: employee.join_date || '',
    employment_status: employee.employment_status || 'active',
    supervisor_1: employee.supervisor_1 || '',
    supervisor_2: employee.supervisor_2 || '',
    annual_leave_balance: Number(employee.annual_leave_balance || 0),
    phl_balance: Number(employee.phl_balance || 0),
    is_active: employee.is_active ?? true,
    personal_phone: employee.personal_phone || '',
    address: employee.address || '',
    emergency_contact_name: employee.emergency_contact_name || '',
    emergency_contact_phone: employee.emergency_contact_phone || '',
  }
}

function findSupervisor(value: string | null | undefined, employees: Employee[]) {
  const normalizedValue = normalizeText(value)

  if (!normalizedValue) return null

  return employees.find((employee) => {
    return (
      normalizeText(employee.id) === normalizedValue ||
      normalizeText(employee.full_name) === normalizedValue ||
      normalizeText(employee.employee_number) === normalizedValue ||
      normalizeText(employee.machine_pin) === normalizedValue ||
      normalizeText(employee.email) === normalizedValue
    )
  }) || null
}

function getSupervisorLabel(value: string | null | undefined, employees: Employee[]) {
  if (!value) return '-'

  const supervisor = findSupervisor(value, employees)

  if (!supervisor) return value

  return `${supervisor.full_name || supervisor.email || supervisor.employee_number || '-'}${supervisor.department ? ` · ${supervisor.department}` : ''}`
}

function normalizeText(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)
  if (words.length === 0) return 'E'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function formatEmploymentStatus(value: string | null | undefined) {
  if (!value) return 'Active'
  if (value === 'active') return 'Active'
  if (value === 'probation') return 'Probation'
  if (value === 'contract') return 'Contract'
  if (value === 'permanent') return 'Permanent'
  if (value === 'resigned') return 'Resigned'
  if (value === 'inactive') return 'Inactive'
  return value
}

function formatGender(value: string | null | undefined) {
  if (value === 'male') return 'Laki-laki'
  if (value === 'female') return 'Perempuan'
  if (value === 'all') return 'Tidak diset'
  return value || '-'
}

function formatAssignmentType(value: string | null | undefined) {
  if (value === 'structural') return 'Jabatan Struktural'
  if (value === 'coordinator') return 'Koordinator / PIC'
  if (value === 'task_force') return 'Task Force'
  if (value === 'acting') return 'Plt. / Pelaksana Tugas'
  if (value === 'additional_assignment') return 'Penugasan Tambahan'
  return value || 'Penugasan Tambahan'
}

function formatDisplayDate(value: string) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}