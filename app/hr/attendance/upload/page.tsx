'use client'

import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  X,
  CloudUpload,
  Database,
  Fingerprint,
  Clock3,
  FileText,
  Download,
  ScanLine,
  Users,
  Settings2,
  ShieldCheck,
  Trash2,
  CalendarDays,
  Activity,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/employee'

type AttendanceUpload = {
  id: string
  file_name: string | null
  file_url: string | null
  file_path: string | null
  file_size: number | null
  file_type: string | null
  uploaded_by: string | null
  status: string | null
  total_rows: number | null
  notes: string | null
  upload_period: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
  deleted_by: string | null
}

type WorkSchedule = {
  id: string
  schedule_name: string
  schedule_code: string
  expected_check_in: string
  expected_check_out: string
  late_tolerance_minutes: number | null
  description: string | null
  is_default: boolean | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

type ParsedRow = {
  machine_pin: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  raw: Record<string, unknown>
}

type AttendanceDecision = {
  status: string
  note: string
  work_duration_minutes: number | null
}

type MatchedPreviewRow = ParsedRow & {
  full_name: string | null
  employee_number: string | null
  department: string | null
  position: string | null
  attendance_status: string
  status_note: string
  work_duration_minutes: number | null
}

type AttendanceLogPayload = {
  upload_id: string
  employee_id: string | null
  employee_number: string | null
  machine_pin: string
  full_name: string | null
  department: string | null
  position: string | null
  attendance_date: string
  check_in: string | null
  check_out: string | null
  total_punches: number
  status: string
  source: string
  raw_data: Record<string, unknown>
  is_matched: boolean
  notes: string | null
  detected_schedule_name: string | null
  detected_schedule_group: string | null
  work_duration_minutes: number | null
  is_double_shift: boolean
  is_night_shift: boolean
  updated_at: string
}

const fallbackSchedule: WorkSchedule = {
  id: 'fallback',
  schedule_name: 'Jam Kerja Reguler Poltek',
  schedule_code: 'regular_poltek',
  expected_check_in: '08:00',
  expected_check_out: '17:00',
  late_tolerance_minutes: 0,
  description: 'Fallback jam kerja reguler Poltek.',
  is_default: true,
  is_active: true,
  created_at: null,
  updated_at: null,
}

export default function HRAttendanceUploadPage() {
  const [uploads, setUploads] = useState<AttendanceUpload[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(fallbackSchedule)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [uploadPeriod, setUploadPeriod] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [parsePreview, setParsePreview] = useState<MatchedPreviewRow[]>([])
  const [parsedTotalRows, setParsedTotalRows] = useState(0)
  const [matchedPreviewCount, setMatchedPreviewCount] = useState(0)
  const [skippedPreviewCount, setSkippedPreviewCount] = useState(0)

  const [scheduleConfirmed, setScheduleConfirmed] = useState(false)

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>()

    employees.forEach((employee) => {
      if (employee.machine_pin) {
        map.set(String(employee.machine_pin).trim(), employee)
      }
    })

    return map
  }, [employees])

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

    const { data: uploadData, error: uploadError } = await supabase
      .from('attendance_uploads')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (uploadError) {
      setErrorMessage(uploadError.message)
      setUploads([])
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

    const { data: scheduleData, error: scheduleError } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('is_active', true)
      .eq('is_default', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (scheduleError) {
      setWorkSchedule(fallbackSchedule)
    } else {
      setWorkSchedule(scheduleData || fallbackSchedule)
    }

    setUploads(uploadData || [])
    setEmployees(employeeData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!selectedFile) return

    const fileToParse: File = selectedFile

    async function refreshPreview(file: File) {
      const result = await parseAttendanceFile(file)

      if (result.error) {
        setErrorMessage(result.error)
        return
      }

      const matchedRows = buildMatchedPreviewRows(result.rows)

      setParsedTotalRows(result.rows.length)
      setMatchedPreviewCount(matchedRows.length)
      setSkippedPreviewCount(result.rows.length - matchedRows.length)
      setParsePreview(matchedRows.slice(0, 5))
    }

    refreshPreview(fileToParse)
  }, [selectedFile, employees, workSchedule])

  function resetUploadForm() {
    setSelectedFile(null)
    setNotes('')
    setUploadPeriod('')
    setParsePreview([])
    setParsedTotalRows(0)
    setMatchedPreviewCount(0)
    setSkippedPreviewCount(0)
    setScheduleConfirmed(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  function validateFile(file: File) {
    const allowedExtensions = ['xls', 'xlsx', 'csv']
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!extension || !allowedExtensions.includes(extension)) {
      return 'Format berkas harus XLS, XLSX, atau CSV.'
    }

    const maxSizeInMb = 10
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024

    if (file.size > maxSizeInBytes) {
      return `Ukuran berkas maksimal ${maxSizeInMb} MB.`
    }

    return ''
  }

  async function handleFileChange(file: File | null) {
    setErrorMessage('')
    setSuccessMessage('')
    setParsePreview([])
    setParsedTotalRows(0)
    setMatchedPreviewCount(0)
    setSkippedPreviewCount(0)
    setScheduleConfirmed(false)

    if (!file) {
      setSelectedFile(null)
      return
    }

    const validationError = validateFile(file)

    if (validationError) {
      setErrorMessage(validationError)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)

    const result = await parseAttendanceFile(file)

    if (result.error) {
      setErrorMessage(result.error)
      return
    }

    const matchedRows = buildMatchedPreviewRows(result.rows)

    setParsedTotalRows(result.rows.length)
    setMatchedPreviewCount(matchedRows.length)
    setSkippedPreviewCount(result.rows.length - matchedRows.length)
    setParsePreview(matchedRows.slice(0, 5))
  }

  async function parseAttendanceFile(file: File) {
    try {
      const buffer = await file.arrayBuffer()

      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
        raw: false,
      })

      const firstSheetName = workbook.SheetNames[0]

      if (!firstSheetName) {
        return {
          rows: [],
          error: 'Sheet tidak ditemukan pada berkas.',
        }
      }

      const sheet = workbook.Sheets[firstSheetName]

      const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
      })

      if (sheetRows.length === 0) {
        return {
          rows: [],
          error: 'Berkas tidak memiliki data.',
        }
      }

      const headerRowIndex = findHeaderRowIndex(sheetRows)

      if (headerRowIndex === -1) {
        return {
          rows: [],
          error:
            'Header tidak ditemukan. Sistem mencari kolom Tanggal, NIP, Scan masuk, dan Scan pulang.',
        }
      }

      const headers = sheetRows[headerRowIndex].map((item) =>
        String(item || '').trim()
      )

      const dataRows = sheetRows.slice(headerRowIndex + 1)

      const objectRows = dataRows.map((row) => {
        const objectRow: Record<string, unknown> = {}

        headers.forEach((header, index) => {
          if (!header) return
          objectRow[header] = row[index] ?? ''
        })

        return objectRow
      })

      const parsedRows = objectRows
        .map((row) => normalizeMachineAttendanceRow(row))
        .filter((row): row is ParsedRow => Boolean(row))

      if (parsedRows.length === 0) {
        return {
          rows: [],
          error:
            'Data tidak dapat dibaca. Pastikan berkas memiliki data NIP, Tanggal, Scan masuk, dan/atau Scan pulang.',
        }
      }

      return {
        rows: parsedRows,
        error: '',
      }
    } catch (error) {
      return {
        rows: [],
        error:
          error instanceof Error
            ? error.message
            : 'Gagal membaca berkas absensi.',
      }
    }
  }

  function findHeaderRowIndex(sheetRows: unknown[][]) {
    return sheetRows.findIndex((row) => {
      const normalizedHeaders = row.map((item) =>
        String(item || '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
      )

      const hasTanggal = normalizedHeaders.includes('tanggal')
      const hasNip = normalizedHeaders.includes('nip')

      const hasScanMasuk =
        normalizedHeaders.includes('scan_masuk') ||
        normalizedHeaders.includes('scanmasuk')

      const hasScanPulang =
        normalizedHeaders.includes('scan_pulang') ||
        normalizedHeaders.includes('scanpulang') ||
        normalizedHeaders.includes('scan_keluar') ||
        normalizedHeaders.includes('scankeluar')

      return hasTanggal && hasNip && hasScanMasuk && hasScanPulang
    })
  }

  function normalizeMachineAttendanceRow(row: Record<string, unknown>) {
    const normalized = normalizeKeys(row)

    const machinePin = getValue(normalized, [
      'nip',
      'machine_pin',
      'pin',
      'user_id',
      'userid',
      'employee_pin',
      'fingerprint_id',
    ])

    const attendanceDateRaw = getValue(normalized, [
      'tanggal',
      'date',
      'attendance_date',
      'scan_date',
      'check_date',
    ])

    const scanMasukRaw = getValue(normalized, [
      'scan_masuk',
      'scanmasuk',
      'check_in',
      'checkin',
      'jam_masuk',
      'masuk',
    ])

    const scanPulangRaw = getValue(normalized, [
      'scan_pulang',
      'scan_keluar',
      'scanpulang',
      'scankeluar',
      'check_out',
      'checkout',
      'jam_pulang',
      'pulang',
      'keluar',
    ])

    const attendanceDate = parseDate(attendanceDateRaw)
    const checkIn = parseTime(scanMasukRaw)
    const checkOut = parseTime(scanPulangRaw)

    if (!machinePin || !attendanceDate) {
      return null
    }

    if (!checkIn && !checkOut) {
      return null
    }

    return {
      machine_pin: String(machinePin).trim(),
      attendance_date: attendanceDate,
      check_in: checkIn || null,
      check_out: checkOut || null,
      raw: row,
    }
  }

  function normalizeKeys(row: Record<string, unknown>) {
    const result: Record<string, unknown> = {}

    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = key
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

      result[normalizedKey] = value
    })

    return result
  }

  function getValue(row: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = row[key]

      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim()
      }
    }

    return ''
  }

  function parseDate(value: string) {
    if (!value) return ''

    const cleaned = String(value).trim()

    const dayFirstMatch = cleaned.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/
    )

    if (dayFirstMatch) {
      const dayNumber = Number(dayFirstMatch[1])
      const monthNumber = Number(dayFirstMatch[2])
      const year = normalizeYear(dayFirstMatch[3])

      if (
        dayNumber >= 1 &&
        dayNumber <= 31 &&
        monthNumber >= 1 &&
        monthNumber <= 12
      ) {
        const day = String(dayNumber).padStart(2, '0')
        const month = String(monthNumber).padStart(2, '0')

        return `${year}-${month}-${day}`
      }
    }

    const isoMatch = cleaned.match(
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
    )

    if (isoMatch) {
      const year = isoMatch[1]
      const monthNumber = Number(isoMatch[2])
      const dayNumber = Number(isoMatch[3])

      if (
        dayNumber >= 1 &&
        dayNumber <= 31 &&
        monthNumber >= 1 &&
        monthNumber <= 12
      ) {
        const month = String(monthNumber).padStart(2, '0')
        const day = String(dayNumber).padStart(2, '0')

        return `${year}-${month}-${day}`
      }
    }

    const directDate = new Date(cleaned)

    if (!Number.isNaN(directDate.getTime())) {
      return formatDateToISO(directDate)
    }

    return ''
  }

  function parseTime(value: string) {
    if (!value) return ''

    const cleaned = value.trim()

    if (
      cleaned === '0' ||
      cleaned === '00:00' ||
      cleaned === '00:00:00' ||
      cleaned.toLowerCase() === 'nan'
    ) {
      return ''
    }

    const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)

    if (timeMatch) {
      const hour = timeMatch[1].padStart(2, '0')
      const minute = timeMatch[2].padStart(2, '0')

      return `${hour}:${minute}`
    }

    const parsedDate = new Date(cleaned)

    if (!Number.isNaN(parsedDate.getTime())) {
      return formatTime(parsedDate)
    }

    return ''
  }

  function normalizeYear(value: string) {
    if (value.length === 2) {
      return `20${value}`
    }

    return value
  }

  function formatDateToISO(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function formatTime(date: Date) {
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')

    return `${hour}:${minute}`
  }

  function getTimeInMinutes(value: string | null) {
    if (!value) return null

    const match = value.match(/^(\d{1,2}):(\d{2})$/)

    if (!match) return null

    const hour = Number(match[1])
    const minute = Number(match[2])

    return hour * 60 + minute
  }

  function getWorkDurationMinutes(checkIn: string | null, checkOut: string | null) {
    const checkInMinutes = getTimeInMinutes(checkIn)
    const checkOutMinutes = getTimeInMinutes(checkOut)

    if (checkInMinutes === null || checkOutMinutes === null) return null

    if (checkOutMinutes >= checkInMinutes) {
      return checkOutMinutes - checkInMinutes
    }

    return checkOutMinutes + 1440 - checkInMinutes
  }

  function getAttendanceDecision(
    checkIn: string | null,
    checkOut: string | null
  ): AttendanceDecision {
    const workDuration = getWorkDurationMinutes(checkIn, checkOut)

    if (!checkIn || !checkOut) {
      return {
        status: 'incomplete',
        note: 'Data tidak lengkap karena scan masuk atau scan pulang tidak tersedia.',
        work_duration_minutes: workDuration,
      }
    }

    const checkInMinutes = getTimeInMinutes(checkIn)
    const expectedCheckInMinutes = getTimeInMinutes(workSchedule.expected_check_in)

    if (checkInMinutes === null || expectedCheckInMinutes === null) {
      return {
        status: 'present',
        note: 'Data hadir. Validasi keterlambatan tidak dilakukan karena format jam tidak valid.',
        work_duration_minutes: workDuration,
      }
    }

    const lateTolerance = Number(workSchedule.late_tolerance_minutes || 0)
    const lateLimit = expectedCheckInMinutes + lateTolerance

    if (checkInMinutes > lateLimit) {
      return {
        status: 'late',
        note: `Terlambat. Jam masuk standar ${workSchedule.expected_check_in}, toleransi ${lateTolerance} menit.`,
        work_duration_minutes: workDuration,
      }
    }

    return {
      status: 'present',
      note: `Hadir sesuai jam kerja reguler ${workSchedule.expected_check_in} - ${workSchedule.expected_check_out}.`,
      work_duration_minutes: workDuration,
    }
  }

  function groupRowsByEmployeeAndDate(rows: ParsedRow[]) {
    const onlyMatchedRows = rows.filter((row) => {
      return employeeMap.has(String(row.machine_pin).trim())
    })

    const groupMap = new Map<string, ParsedRow[]>()

    onlyMatchedRows.forEach((row) => {
      const key = `${row.machine_pin}-${row.attendance_date}`
      const existing = groupMap.get(key) || []
      groupMap.set(key, [...existing, row])
    })

    return groupMap
  }

  function getFinalScan(group: ParsedRow[]) {
    const checkIns = group
      .map((item) => item.check_in)
      .filter((item): item is string => Boolean(item))
      .sort()

    const checkOuts = group
      .map((item) => item.check_out)
      .filter((item): item is string => Boolean(item))
      .sort()

    const checkIn = checkIns[0] || null
    const checkOut =
      checkOuts.length > 0 ? checkOuts[checkOuts.length - 1] : null

    return {
      checkIn,
      checkOut,
      checkIns,
      checkOuts,
    }
  }

  function buildMatchedPreviewRows(rows: ParsedRow[]): MatchedPreviewRow[] {
    const groupedRows = groupRowsByEmployeeAndDate(rows)

    return Array.from(groupedRows.values())
      .map((group) => {
        const first = group[0]
        const employee = employeeMap.get(first.machine_pin)

        if (!employee) return null

        const { checkIn, checkOut } = getFinalScan(group)
        const decision = getAttendanceDecision(checkIn, checkOut)

        return {
          ...first,
          check_in: checkIn,
          check_out: checkOut,
          full_name: employee.full_name || null,
          employee_number: employee.employee_number || null,
          department: employee.department || null,
          position: employee.position || null,
          attendance_status: decision.status,
          status_note: decision.note,
          work_duration_minutes: decision.work_duration_minutes,
        }
      })
      .filter((row): row is MatchedPreviewRow => Boolean(row))
  }

  function buildAttendanceLogs(
    uploadId: string,
    rows: ParsedRow[]
  ): AttendanceLogPayload[] {
    const groupMap = groupRowsByEmployeeAndDate(rows)

    return Array.from(groupMap.entries()).map(([, group]) => {
      const first = group[0]
      const employee = employeeMap.get(first.machine_pin)
      const { checkIn, checkOut, checkIns, checkOuts } = getFinalScan(group)

      if (!employee) {
        throw new Error('Data karyawan tidak ditemukan.')
      }

      const decision = getAttendanceDecision(checkIn, checkOut)

      return {
        upload_id: uploadId,

        employee_id: employee.id || null,
        employee_number: employee.employee_number || null,
        machine_pin: first.machine_pin,
        full_name: employee.full_name || null,
        department: employee.department || null,
        position: employee.position || null,

        attendance_date: first.attendance_date,
        check_in: checkIn,
        check_out: checkOut,

        total_punches: group.reduce((total, item) => {
          const inCount = item.check_in ? 1 : 0
          const outCount = item.check_out ? 1 : 0
          return total + inCount + outCount
        }, 0),

        status: decision.status,
        source: 'upload',

        raw_data: {
          rows: group.map((item) => item.raw),
          check_ins: checkIns,
          check_outs: checkOuts,
          schedule_name: workSchedule.schedule_name,
          expected_check_in: workSchedule.expected_check_in,
          expected_check_out: workSchedule.expected_check_out,
          late_tolerance_minutes: workSchedule.late_tolerance_minutes || 0,
          skipped_unmatched_machine_pin: false,
        },

        is_matched: true,
        notes: decision.note,

        detected_schedule_name: workSchedule.schedule_name,
        detected_schedule_group: 'regular',
        work_duration_minutes: decision.work_duration_minutes,
        is_double_shift: false,
        is_night_shift: false,

        updated_at: new Date().toISOString(),
      }
    })
  }

  async function insertAttendanceLogs(logs: AttendanceLogPayload[]) {
    const batchSize = 500

    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize)

      const { error } = await supabase
        .from('attendance_logs')
        .upsert(batch, {
          onConflict: 'machine_pin,attendance_date',
        })

      if (error) {
        return error.message
      }
    }

    return ''
  }

  async function syncApprovedRequestsAfterUpload(logs: AttendanceLogPayload[]) {
    const employeePeriodMap = new Map<
      string,
      {
        employee_id: string
        start: string
        end: string
      }
    >()

    logs.forEach((log) => {
      if (!log.employee_id) return

      const existing = employeePeriodMap.get(log.employee_id)

      if (!existing) {
        employeePeriodMap.set(log.employee_id, {
          employee_id: log.employee_id,
          start: log.attendance_date,
          end: log.attendance_date,
        })

        return
      }

      if (log.attendance_date < existing.start) {
        existing.start = log.attendance_date
      }

      if (log.attendance_date > existing.end) {
        existing.end = log.attendance_date
      }

      employeePeriodMap.set(log.employee_id, existing)
    })

    const items = Array.from(employeePeriodMap.values())

    let successCount = 0
    const errors: string[] = []

    for (const item of items) {
      const { error } = await supabase.rpc(
        'sync_employee_absence_requests_to_attendance',
        {
          p_employee_id: item.employee_id,
          p_period_start: item.start,
          p_period_end: item.end,
        }
      )

      if (error) {
        errors.push(error.message)
      } else {
        successCount += 1
      }
    }

    return {
      successCount,
      errorMessage: errors.length > 0 ? errors.join(' | ') : '',
    }
  }

  async function handleUpload() {
    setUploading(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!selectedFile) {
      setErrorMessage('Pilih berkas absensi terlebih dahulu.')
      setUploading(false)
      return
    }

    const validationError = validateFile(selectedFile)

    if (validationError) {
      setErrorMessage(validationError)
      setUploading(false)
      return
    }

    if (!scheduleConfirmed) {
      setErrorMessage(
        'Konfirmasi jam kerja reguler wajib dilakukan sebelum proses unggah.'
      )
      setUploading(false)
      return
    }

    const parseResult = await parseAttendanceFile(selectedFile)

    if (parseResult.error) {
      setErrorMessage(parseResult.error)
      setUploading(false)
      return
    }

    const logsPreview = buildAttendanceLogs('preview', parseResult.rows)

    if (logsPreview.length === 0) {
      setErrorMessage(
        'Tidak ada data yang dapat diproses karena seluruh NIP pada berkas tidak sesuai dengan machine_pin pada data master karyawan.'
      )
      setUploading(false)
      return
    }

    const fileExt = selectedFile.name.split('.').pop()
    const safeName = selectedFile.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')

    const filePath = `attendance/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('attendance-uploads')
      .upload(filePath, selectedFile)

    if (uploadError) {
      setErrorMessage(uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('attendance-uploads')
      .getPublicUrl(filePath)

    const skippedRows = parseResult.rows.length - logsPreview.length

    const { data: uploadRecord, error: insertError } = await supabase
      .from('attendance_uploads')
      .insert({
        file_name: selectedFile.name,
        file_url: publicUrlData.publicUrl,
        file_path: filePath,
        file_size: selectedFile.size,
        file_type: fileExt || selectedFile.type || 'unknown',
        uploaded_by: 'HR',
        status: 'uploaded',
        total_rows: parseResult.rows.length,
        upload_period: uploadPeriod || selectedFile.name,
        notes:
          notes ||
          `Diproses menggunakan jam kerja reguler ${workSchedule.expected_check_in} - ${workSchedule.expected_check_out}. ${skippedRows} data dilewati karena NIP tidak sesuai dengan machine_pin data master karyawan.`,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !uploadRecord) {
      setErrorMessage(insertError?.message || 'Gagal menyimpan metadata unggahan.')
      setUploading(false)
      return
    }

    const logs = buildAttendanceLogs(uploadRecord.id, parseResult.rows)
    const logError = await insertAttendanceLogs(logs)

    if (logError) {
      await supabase
        .from('attendance_uploads')
        .update({
          status: 'failed',
          notes: `${notes || ''} | Error proses data: ${logError}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uploadRecord.id)

      setErrorMessage(logError)
      setUploading(false)
      await fetchData()
      return
    }

    const syncResult = await syncApprovedRequestsAfterUpload(logs)

    if (syncResult.errorMessage) {
      await supabase
        .from('attendance_uploads')
        .update({
          status: 'processed_with_warning',
          total_rows: logs.length,
          notes:
            notes ||
            `Data absensi berhasil diproses, tetapi sinkron cuti/izin/PHL memiliki catatan: ${syncResult.errorMessage}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uploadRecord.id)

      setErrorMessage(
        `Data absensi berhasil diproses, tetapi sinkron cuti/izin/PHL gagal sebagian: ${syncResult.errorMessage}`
      )

      setSelectedFile(null)
      setNotes('')
      setUploadPeriod('')
      setParsePreview([])
      setParsedTotalRows(0)
      setMatchedPreviewCount(0)
      setSkippedPreviewCount(0)
      setScheduleConfirmed(false)
      setUploading(false)

      await fetchData()
      return
    }

    await supabase
      .from('attendance_uploads')
      .update({
        status: 'processed',
        total_rows: logs.length,
        notes:
          notes ||
          `Diproses otomatis berdasarkan machine_pin dan jam kerja reguler. ${skippedRows} data dilewati karena NIP tidak sesuai dengan machine_pin data master karyawan. Sinkron cuti/izin/PHL approved berhasil dijalankan untuk ${syncResult.successCount} karyawan.`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', uploadRecord.id)

    setSuccessMessage(
      `Berkas berhasil diproses. ${logs.length} data absensi dibuat atau diperbarui. ${skippedRows} data dilewati. Sinkron cuti/izin/PHL approved berhasil dijalankan untuk ${syncResult.successCount} karyawan.`
    )

    setSelectedFile(null)
    setNotes('')
    setUploadPeriod('')
    setParsePreview([])
    setParsedTotalRows(0)
    setMatchedPreviewCount(0)
    setSkippedPreviewCount(0)
    setScheduleConfirmed(false)
    setUploading(false)

    await fetchData()
  }

  async function handleDeleteUpload(upload: AttendanceUpload) {
    const confirmed = window.confirm(
      `Hapus upload "${upload.file_name || upload.upload_period || '-'}"?\n\nData attendance_logs dari upload ini juga akan dihapus dari sistem.`
    )

    if (!confirmed) return

    setDeletingId(upload.id)
    setErrorMessage('')
    setSuccessMessage('')

    const { error: logError } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('upload_id', upload.id)

    if (logError) {
      setErrorMessage(logError.message)
      setDeletingId(null)
      return
    }

    if (upload.file_path) {
      await supabase.storage
        .from('attendance-uploads')
        .remove([upload.file_path])
    }

    const { error: uploadError } = await supabase
      .from('attendance_uploads')
      .delete()
      .eq('id', upload.id)

    if (uploadError) {
      setErrorMessage(uploadError.message)
      setDeletingId(null)
      return
    }

    setSuccessMessage('Upload absensi dan data absensi terkait berhasil dihapus.')
    setDeletingId(null)
    await fetchData()
  }

  const totalUploads = uploads.length

  const processedCount = uploads.filter((item) => {
    return item.status === 'processed' || item.status === 'processed_with_warning'
  }).length

  const latestUpload = uploads[0]
  const activeEmployees = employees.length

  const latePreviewCount = parsePreview.filter(
    (item) => item.attendance_status === 'late'
  ).length

  const incompletePreviewCount = parsePreview.filter(
    (item) => item.attendance_status === 'incomplete'
  ).length

  return (
    <>
      <Topbar
        title="Upload Absensi"
        description="Unggah berkas mesin absensi. Sistem hanya memproses NIP yang sesuai dengan machine_pin pada data karyawan Poltek."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Unggahan"
            value={String(totalUploads)}
            description="Seluruh berkas tersimpan"
            icon={<Upload size={20} />}
            tone="blue"
          />

          <SummaryCard
            title="Processed"
            value={String(processedCount)}
            description="Sudah masuk data absensi"
            icon={<CheckCircle2 size={20} />}
            tone="green"
          />

          <SummaryCard
            title="Employee PIN"
            value={String(activeEmployees)}
            description="Data master karyawan aktif"
            icon={<Users size={20} />}
            tone="purple"
          />

          <SummaryCard
            title="Unggahan Terbaru"
            value={latestUpload ? 'Tersedia' : '-'}
            description={latestUpload?.file_name || 'Belum ada unggahan'}
            icon={<Clock3 size={20} />}
            tone="orange"
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

        <div className="grid gap-6 xl:grid-cols-[1fr_0.78fr]">
          <div className="harmony-card harmony-slide-up overflow-hidden">
            <div className="border-b border-black/5 bg-white/55 p-5">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
                <Upload size={14} />
                Attendance Import
              </div>

              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Unggah & Proses Berkas Mesin Absensi
              </h2>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Sistem membaca NIP sebagai machine_pin, tanggal sebagai attendance_date, scan masuk sebagai check_in, dan scan pulang sebagai check_out.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-[28px] border border-black/5 bg-white/65 p-5 shadow-sm backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-2">
                  <Settings2 size={18} className="text-[#007aff]" />
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Konfirmasi Jam Kerja Reguler
                  </h3>
                </div>

                <p className="mb-5 text-sm leading-6 text-[#6e6e73]">
                  Sistem akan menggunakan jam kerja default yang aktif pada menu Pengaturan.
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                  <MiniInfoCard
                    title="Nama Jadwal"
                    value={workSchedule.schedule_name}
                  />

                  <MiniInfoCard
                    title="Jam Kerja"
                    value={`${workSchedule.expected_check_in} - ${workSchedule.expected_check_out}`}
                  />

                  <MiniInfoCard
                    title="Toleransi"
                    value={`${workSchedule.late_tolerance_minutes || 0} menit`}
                  />
                </div>

                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[22px] border border-black/5 bg-[#f5f5f7]/80 p-4 shadow-sm transition hover:bg-white">
                  <input
                    type="checkbox"
                    checked={scheduleConfirmed}
                    onChange={(event) =>
                      setScheduleConfirmed(event.target.checked)
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <div>
                    <div className="font-semibold text-[#1d1d1f]">
                      Saya mengonfirmasi bahwa jam kerja reguler sudah benar.
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                      Sistem akan memproses absensi menggunakan jam kerja {workSchedule.expected_check_in} - {workSchedule.expected_check_out}.
                    </p>
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="harmony-label">
                  Nama / Periode Upload
                </span>

                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"
                  />

                  <input
                    value={uploadPeriod}
                    onChange={(event) => setUploadPeriod(event.target.value)}
                    placeholder="Contoh: Absensi Mei 2026 / Absensi Minggu 1 Mei 2026"
                    className="harmony-input pl-11"
                  />
                </div>
              </label>

              <label
                htmlFor="attendance-file"
                className={[
                  'group flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[30px] border border-dashed p-7 text-center shadow-sm transition hover:-translate-y-0.5',
                  selectedFile
                    ? 'border-[#007aff]/40 bg-[#e8f2ff]/70'
                    : 'border-black/10 bg-white/55 hover:border-[#007aff]/40 hover:bg-white',
                ].join(' ')}
              >
                <input
                  id="attendance-file"
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    handleFileChange(file)
                  }}
                />

                <div
                  className={[
                    'mb-5 flex h-18 w-18 items-center justify-center rounded-[26px] transition',
                    selectedFile
                      ? 'bg-[#007aff] text-white'
                      : 'bg-[#e8f2ff] text-[#007aff] group-hover:scale-105',
                  ].join(' ')}
                >
                  {selectedFile ? (
                    <FileSpreadsheet size={32} />
                  ) : (
                    <CloudUpload size={32} />
                  )}
                </div>

                <h3 className="text-xl font-semibold text-[#1d1d1f]">
                  {selectedFile ? selectedFile.name : 'Pilih berkas absensi'}
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-[#6e6e73]">
                  {selectedFile
                    ? `${formatFileSize(selectedFile.size)} · Berkas siap diproses setelah konfirmasi jam kerja.`
                    : 'Unggah berkas hasil ekspor mesin absensi. Data dengan NIP yang tidak sesuai master karyawan tidak akan diproses.'}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#007aff] shadow-sm">
                  <FileText size={14} />
                  XLS / XLSX / CSV · Maksimal 10 MB
                </div>
              </label>

              {selectedFile && (
                <div className="grid gap-4 md:grid-cols-5">
                  <MiniInfoCard title="Baris terbaca" value={String(parsedTotalRows)} />
                  <MiniInfoCard title="Sesuai DB" value={String(matchedPreviewCount)} />
                  <MiniInfoCard title="Dilewati" value={String(skippedPreviewCount)} />
                  <MiniInfoCard title="Late" value={String(latePreviewCount)} />
                  <MiniInfoCard title="Incomplete" value={String(incompletePreviewCount)} />
                </div>
              )}

              {parsePreview.length > 0 && (
                <div className="rounded-[28px] border border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur-xl">
                  <div className="mb-4 flex items-center gap-2">
                    <ScanLine size={18} className="text-[#007aff]" />
                    <h3 className="font-semibold text-[#1d1d1f]">
                      Pratinjau Data yang Akan Diproses
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[950px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/5 text-xs uppercase text-[#6e6e73]">
                          <th className="py-2">Employee</th>
                          <th className="py-2">Machine PIN</th>
                          <th className="py-2">Tanggal</th>
                          <th className="py-2">Check In</th>
                          <th className="py-2">Check Out</th>
                          <th className="py-2">Durasi</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {parsePreview.map((row, index) => (
                          <tr
                            key={`${row.machine_pin}-${index}`}
                            className="border-b border-black/5"
                          >
                            <td className="py-2">
                              <div className="font-semibold text-[#1d1d1f]">
                                {row.full_name || '-'}
                              </div>
                              <div className="text-xs text-[#6e6e73]">
                                {row.department || '-'}
                              </div>
                            </td>

                            <td className="py-2 font-semibold text-[#1d1d1f]">
                              {row.machine_pin}
                            </td>

                            <td className="py-2 text-[#1d1d1f]">
                              {row.attendance_date}
                            </td>

                            <td className="py-2 text-[#1d1d1f]">
                              {row.check_in || '-'}
                            </td>

                            <td className="py-2 text-[#1d1d1f]">
                              {row.check_out || '-'}
                            </td>

                            <td className="py-2 text-[#1d1d1f]">
                              {formatDuration(row.work_duration_minutes)}
                            </td>

                            <td className="py-2">
                              <StatusBadge status={row.attendance_status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-4 text-xs leading-5 text-[#6e6e73]">
                    Pratinjau hanya menampilkan maksimal 5 data yang sesuai dengan database karyawan.
                  </p>
                </div>
              )}

              <label className="block">
                <span className="harmony-label">
                  Catatan Unggahan
                </span>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Contoh: Data absensi periode Mei 2026, hasil ekspor langsung dari mesin fingerprint."
                  className="harmony-textarea"
                />
              </label>

              <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={resetUploadForm}
                  className="harmony-button-secondary"
                >
                  <X size={18} />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="harmony-button-primary"
                >
                  <Upload size={18} />
                  {uploading ? 'Memproses...' : 'Unggah & Proses'}
                </button>
              </div>
            </div>
          </div>

          <div className="harmony-card harmony-slide-up overflow-hidden">
            <div className="border-b border-black/5 bg-white/55 p-5">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f7edfc] px-3 py-1.5 text-xs font-bold text-[#7b2cbf]">
                <Database size={14} />
                Processing Logic
              </div>

              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Logika Pemrosesan
              </h2>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Sistem telah disederhanakan khusus untuk karyawan Poltek dengan jam kerja reguler.
              </p>
            </div>

            <div className="space-y-4 p-5">
              <ProcessItem
                number="01"
                title="Validasi Database Karyawan"
                description="Sistem hanya memproses NIP yang sesuai dengan machine_pin pada master karyawan aktif."
                icon={<ShieldCheck size={18} />}
              />

              <ProcessItem
                number="02"
                title="Membaca NIP"
                description="Kolom NIP pada berkas digunakan sebagai machine_pin."
                icon={<Fingerprint size={18} />}
              />

              <ProcessItem
                number="03"
                title="Membaca Tanggal & Scan"
                description="Tanggal menjadi attendance_date, Scan masuk menjadi check_in, dan Scan pulang menjadi check_out."
                icon={<Clock3 size={18} />}
              />

              <ProcessItem
                number="04"
                title="Status Otomatis"
                description="Sistem menentukan present, late, atau incomplete berdasarkan jam kerja reguler."
                icon={<Database size={18} />}
              />

              <ProcessItem
                number="05"
                title="Sinkron Cuti/Izin/PHL"
                description="Setelah upload berhasil, sistem otomatis menarik pengajuan cuti, izin, sakit, tugas luar, dan klaim PHL yang sudah approved ke attendance_logs."
                icon={<CalendarDays size={18} />}
              />

              <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  <CheckCircle2 size={18} />
                  Data otomatis difilter
                </div>
                Data dengan NIP yang tidak tersedia pada master karyawan tidak akan masuk ke attendance_logs.
              </div>

              <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  <AlertTriangle size={18} />
                  Konfirmasi wajib
                </div>
                Proses upload tidak dapat dilakukan sebelum HR mengonfirmasi jam kerja reguler.
              </div>
            </div>
          </div>
        </div>

        <UploadHistory
          uploads={uploads}
          loading={loading}
          deletingId={deletingId}
          fetchData={fetchData}
          handleDeleteUpload={handleDeleteUpload}
        />
      </section>
    </>
  )
}

function UploadHistory({
  uploads,
  loading,
  deletingId,
  fetchData,
  handleDeleteUpload,
}: {
  uploads: AttendanceUpload[]
  loading: boolean
  deletingId: string | null
  fetchData: () => void
  handleDeleteUpload: (upload: AttendanceUpload) => void
}) {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-black/5 bg-white/55 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#eaf8ee] px-3 py-1.5 text-xs font-bold text-[#168034]">
            <Activity size={14} />
            Upload Record
          </div>

          <h2 className="text-lg font-semibold text-[#1d1d1f]">
            Riwayat Unggahan
          </h2>

          <p className="mt-1 text-sm text-[#6e6e73]">
            Riwayat berkas absensi yang pernah diunggah dan diproses.
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

      {loading && (
        <div className="p-6 text-sm text-[#6e6e73]">
          Memuat riwayat unggahan...
        </div>
      )}

      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                <th className="w-[30%] px-5 py-4 font-semibold">Berkas</th>
                <th className="w-[18%] px-5 py-4 font-semibold">Periode</th>
                <th className="w-[12%] px-5 py-4 font-semibold">Ukuran</th>
                <th className="w-[10%] px-5 py-4 font-semibold">Baris</th>
                <th className="w-[12%] px-5 py-4 font-semibold">Status</th>
                <th className="w-[12%] px-5 py-4 font-semibold">Tanggal Upload</th>
                <th className="w-[6%] px-5 py-4 text-center font-semibold">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {uploads.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-black/5 transition hover:bg-white/55"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
                        <FileSpreadsheet size={19} />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#1d1d1f]">
                          {item.file_name || '-'}
                        </div>
                        <div className="mt-1 truncate text-xs text-[#6e6e73]">
                          {item.notes || 'Tidak ada catatan'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-[#1d1d1f]">
                    {item.upload_period || item.file_name || '-'}
                  </td>

                  <td className="px-5 py-3.5 text-[#1d1d1f]">
                    {formatFileSize(Number(item.file_size || 0))}
                  </td>

                  <td className="px-5 py-3.5 font-semibold text-[#1d1d1f]">
                    {item.total_rows || 0}
                  </td>

                  <td className="px-5 py-3.5">
                    <UploadStatusBadge status={item.status || 'uploaded'} />
                  </td>

                  <td className="px-5 py-3.5 text-[#6e6e73]">
                    {formatDateTime(item.created_at)}
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex justify-center gap-2">
                      {item.file_url ? (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-black/5 bg-white text-[#007aff] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f5f5f7] hover:shadow-md"
                          title="Unduh / pratinjau berkas"
                        >
                          <Download size={15} />
                        </a>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDeleteUpload(item)}
                        disabled={deletingId === item.id}
                        title="Hapus upload dan data absensi terkait"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {uploads.length === 0 && (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
                <Upload size={24} />
              </div>

              <h3 className="mt-4 font-semibold text-[#1d1d1f]">
                Belum ada berkas absensi
              </h3>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Unggah berkas absensi pertama untuk memulai proses import data.
              </p>
            </div>
          )}
        </div>
      )}
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

function MiniInfoCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <p className="truncate text-xs font-semibold text-[#6e6e73]">
        {title}
      </p>

      <p className="mt-2 truncate text-xl font-semibold text-[#1d1d1f]">
        {value}
      </p>
    </div>
  )
}

function ProcessItem({
  number,
  title,
  description,
  icon,
}: {
  number: string
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/65 p-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white">
          {number}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[#007aff]">
              {icon}
            </div>

            <h3 className="font-semibold text-[#1d1d1f]">
              {title}
            </h3>
          </div>

          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'present'
      ? 'bg-green-50 text-green-700'
      : status === 'late'
        ? 'bg-orange-50 text-orange-700'
        : status === 'incomplete'
          ? 'bg-red-50 text-red-700'
          : 'bg-[#e8f2ff] text-[#0059b8]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${className}`}>
      {formatAttendanceStatus(status)}
    </span>
  )
}

function UploadStatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'processed'
      ? 'bg-green-50 text-green-700'
      : status === 'processed_with_warning'
        ? 'bg-orange-50 text-orange-700'
        : status === 'failed'
          ? 'bg-red-50 text-red-700'
          : 'bg-orange-50 text-orange-700'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${className}`}>
      {status.replaceAll('_', ' ')}
    </span>
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

function formatAttendanceStatus(status: string) {
  if (status === 'present') return 'Present'
  if (status === 'late') return 'Late'
  if (status === 'incomplete') return 'Incomplete'
  return status
}

function formatDuration(value: number | null) {
  if (value === null || value === undefined) return '-'

  const hours = Math.floor(value / 60)
  const minutes = value % 60

  return `${hours}j ${minutes}m`
}

function formatFileSize(size: number) {
  if (!size) return '-'

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(value: string | null) {
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