import { NextRequest, NextResponse } from 'next/server'

import {
  harmonyApiError,
  normalizeHarmonyRole,
  requireHarmonyApi,
} from '@/lib/server/user-api-auth'
import {
  getPHLSubordinateIds,
  notifyPHLWorkCancelled,
  notifyPHLWorkSubmitted,
} from '@/lib/server/phl-work'

export const runtime = 'nodejs'

const BUCKET = 'leave-attachments'
const MAX_FILES = 3
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MIN_WORK_MINUTES = 240
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
  'xls',
  'xlsx',
])
const HR_ROLES = new Set(['hr', 'admin', 'administrator', 'super_admin', 'human_resources'])

function clean(value: unknown) {
  return String(value || '').trim()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function safeFileName(value: string) {
  return value
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(-120) || 'file'
}

function validateFile(file: File) {
  const extension = clean(file.name).split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return 'Format evidence tidak didukung. Gunakan PDF, JPG, PNG, WEBP, DOC/DOCX, atau XLS/XLSX.'
  }
  if (file.size > MAX_FILE_BYTES) return `Ukuran ${file.name} melebihi 10 MB.`
  return ''
}

function timeToMinutes(value: unknown) {
  const raw = clean(value)
  const match = raw.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

function durationBetween(start: unknown, end: unknown) {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  if (startMinutes === null || endMinutes === null) return 0
  const difference = endMinutes - startMinutes
  return difference > 0 ? difference : difference + 24 * 60
}

function attendanceDuration(row: any) {
  const direct = Number(row?.work_duration_minutes || 0)
  if (Number.isFinite(direct) && direct > 0) return direct

  const start =
    row?.check_in || row?.manual_check_in || row?.requested_check_in || null
  const end =
    row?.check_out || row?.manual_check_out || row?.requested_check_out || null
  return durationBetween(start, end)
}

function todayWita() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const map = new Map(parts.map((part) => [part.type, part.value]))
  return `${map.get('year')}-${map.get('month')}-${map.get('day')}`
}

function dateDiffDays(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`).getTime()
  const end = new Date(`${to}T00:00:00Z`).getTime()
  return Math.floor((end - start) / 86400000)
}

function isWeekendDate(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day === 0 || day === 6
}

async function withAttachments(admin: any, rows: any[]) {
  if (!rows.length) return rows

  const ids = rows.map((row) => row.id)
  const { data: attachments, error } = await admin
    .from('phl_work_request_attachments')
    .select('id,request_id,slot_no,file_name,mime_type,file_size,storage_bucket,storage_path,legacy_file_url')
    .in('request_id', ids)
    .order('slot_no', { ascending: true })

  if (error) throw error

  const grouped = new Map<string, any[]>()

  for (const attachment of attachments || []) {
    let signedUrl: string | null = attachment.legacy_file_url || null
    if (attachment.storage_path) {
      const { data } = await admin.storage
        .from(attachment.storage_bucket || BUCKET)
        .createSignedUrl(attachment.storage_path, 60 * 30)
      signedUrl = data?.signedUrl || signedUrl
    }

    const list = grouped.get(attachment.request_id) || []
    list.push({
      id: attachment.id,
      slot_no: attachment.slot_no,
      file_name: attachment.file_name,
      mime_type: attachment.mime_type,
      file_size: attachment.file_size,
      signed_url: signedUrl,
    })
    grouped.set(attachment.request_id, list)
  }

  return rows.map((row) => ({
    ...row,
    attachments: grouped.get(row.id) || [],
  }))
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireHarmonyApi(request)
    const scope = clean(request.nextUrl.searchParams.get('scope') || 'mine').toLowerCase()
    let query = context.admin
      .from('phl_work_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (scope === 'all') {
      if (!HR_ROLES.has(normalizeHarmonyRole(context.appUser.role))) {
        return NextResponse.json(
          { success: false, error: 'Hanya HR yang dapat melihat seluruh pengajuan PHL.' },
          { status: 403 },
        )
      }
    } else if (scope === 'team') {
      if (!context.employee) {
        return NextResponse.json(
          { success: false, error: 'Data employee atasan tidak ditemukan.' },
          { status: 403 },
        )
      }
      const subordinateIds = await getPHLSubordinateIds(context.admin, context.employee)
      if (!subordinateIds.length) {
        return NextResponse.json({ success: true, requests: [] })
      }
      query = query.in('employee_id', subordinateIds)
    } else {
      if (!context.employee) {
        return NextResponse.json(
          { success: false, error: 'Akun belum terhubung ke data employee.' },
          { status: 403 },
        )
      }
      query = query.eq('employee_id', context.employee.id)
    }

    const { data, error } = await query
    if (error) throw error

    const rows = await withAttachments(context.admin, data || [])
    return NextResponse.json({ success: true, requests: rows })
  } catch (error) {
    const normalized = harmonyApiError(error, 'Pengajuan PHL gagal dimuat.')
    return NextResponse.json(
      { success: false, error: normalized.message },
      { status: normalized.status },
    )
  }
}

export async function POST(request: NextRequest) {
  const uploadedPaths: string[] = []

  try {
    const context = await requireHarmonyApi(request)
    if (!context.employee || context.employee.is_active === false) {
      return NextResponse.json(
        { success: false, error: 'Akun belum terhubung ke employee aktif.' },
        { status: 403 },
      )
    }

    const body = await request.formData()
    const requestKey = clean(body.get('request_key'))
    const workDate = clean(body.get('work_date'))
    const startTime = clean(body.get('work_start_time'))
    const endTime = clean(body.get('work_end_time'))
    const workPurpose = clean(body.get('work_purpose'))
    const notes = clean(body.get('notes'))
    const files = body
      .getAll('files')
      .filter((item): item is File => item instanceof File && item.size > 0)

    if (!isUuid(requestKey)) {
      return NextResponse.json({ success: false, error: 'Request key PHL tidak valid.' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
      return NextResponse.json({ success: false, error: 'Tanggal pelaksanaan PHL wajib diisi.' }, { status: 400 })
    }

    const today = todayWita()
    if (workDate > today) {
      return NextResponse.json({ success: false, error: 'PHL hanya dapat diajukan untuk pekerjaan yang sudah dilaksanakan.' }, { status: 400 })
    }
    if (dateDiffDays(workDate, today) > 90) {
      return NextResponse.json({ success: false, error: 'Tanggal pelaksanaan PHL sudah lebih dari 90 hari.' }, { status: 400 })
    }

    const requestedMinutes = durationBetween(startTime, endTime)
    if (requestedMinutes < MIN_WORK_MINUTES) {
      return NextResponse.json(
        { success: false, error: 'Durasi penugasan PHL minimal 4 jam.' },
        { status: 400 },
      )
    }
    if (workPurpose.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Keperluan/penugasan PHL minimal 5 karakter.' },
        { status: 400 },
      )
    }
    if (files.length < 1 || files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: 'Surat Tugas/evidence wajib minimal 1 file dan maksimal 3 file.' },
        { status: 400 },
      )
    }
    for (const file of files) {
      const validation = validateFile(file)
      if (validation) return NextResponse.json({ success: false, error: validation }, { status: 400 })
    }

    const { data: duplicate, error: duplicateError } = await context.admin
      .from('phl_work_requests')
      .select('id,status')
      .eq('employee_id', context.employee.id)
      .eq('work_date', workDate)
      .in('status', ['pending_supervisor', 'approved'])
      .limit(1)
      .maybeSingle()
    if (duplicateError) throw duplicateError
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'Sudah ada pengajuan PHL aktif pada tanggal tersebut.' },
        { status: 409 },
      )
    }

    const { data: existingCredit, error: existingCreditError } = await context.admin
      .from('phl_records')
      .select('id')
      .eq('employee_id', context.employee.id)
      .eq('phl_date', workDate)
      .eq('source', 'attendance_phl_approved')
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()
    if (existingCreditError) throw existingCreditError
    if (existingCredit) {
      return NextResponse.json(
        { success: false, error: 'Saldo PHL untuk tanggal tersebut sudah pernah terbentuk.' },
        { status: 409 },
      )
    }

    const { data: attendance, error: attendanceError } = await context.admin
      .from('attendance_logs')
      .select('id,employee_id,machine_pin,attendance_date,check_in,check_out,manual_check_in,manual_check_out,requested_check_in,requested_check_out,work_duration_minutes,deleted_at')
      .eq('employee_id', context.employee.id)
      .eq('attendance_date', workDate)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (attendanceError) throw attendanceError
    if (!attendance) {
      return NextResponse.json(
        { success: false, error: 'Data absensi pada tanggal tersebut belum tercatat. PHL baru dapat diajukan setelah absensi tersedia.' },
        { status: 400 },
      )
    }

    const recordedMinutes = attendanceDuration(attendance)
    if (recordedMinutes < MIN_WORK_MINUTES) {
      return NextResponse.json(
        { success: false, error: `Durasi kerja yang tercatat baru ${recordedMinutes} menit. PHL membutuhkan minimal 240 menit (4 jam).` },
        { status: 400 },
      )
    }

    const { data: holiday, error: holidayError } = await context.admin
      .from('holidays')
      .select('holiday_name,holiday_type')
      .eq('holiday_date', workDate)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (holidayError) throw holidayError

    const dayType = holiday ? 'holiday' : isWeekendDate(workDate) ? 'weekend' : 'weekday'

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const path = `phl-work-requests/${context.employee.id}/${requestKey}/${index + 1}-${safeFileName(file.name)}`
      const { error: uploadError } = await context.admin.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (uploadError) throw uploadError
      uploadedPaths.push(path)
    }

    const { data: inserted, error: insertError } = await context.admin
      .from('phl_work_requests')
      .insert({
        request_key: requestKey,
        employee_id: context.employee.id,
        employee_number: context.employee.employee_number || null,
        machine_pin: context.employee.machine_pin || null,
        full_name: context.employee.full_name || null,
        department: context.employee.department || null,
        position: context.employee.position || null,
        email: context.employee.email || context.authEmail || null,
        work_date: workDate,
        work_start_time: startTime,
        work_end_time: endTime,
        requested_work_minutes: requestedMinutes,
        recorded_work_minutes: recordedMinutes,
        attendance_log_id: attendance.id,
        attendance_verified: true,
        work_day_type: dayType,
        holiday_name: holiday?.holiday_name || null,
        work_purpose: workPurpose,
        notes: notes || null,
        status: 'pending_supervisor',
        supervisor_status: 'pending',
        balance_days: 1,
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    const attachmentRows = files.map((file, index) => ({
      request_id: inserted.id,
      slot_no: index + 1,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      storage_bucket: BUCKET,
      storage_path: uploadedPaths[index],
    }))

    const { error: attachmentError } = await context.admin
      .from('phl_work_request_attachments')
      .insert(attachmentRows)

    if (attachmentError) {
      await context.admin.from('phl_work_requests').delete().eq('id', inserted.id)
      throw attachmentError
    }

    const notification = await notifyPHLWorkSubmitted(context.admin, inserted).catch((error: any) => ({
      ok: false,
      message: error?.message || 'Email atasan gagal dikirim.',
    }))

    const [requestWithAttachments] = await withAttachments(context.admin, [inserted])

    return NextResponse.json({
      success: true,
      request: requestWithAttachments,
      notification,
    })
  } catch (error) {
    const normalized = harmonyApiError(error, 'Pengajuan PHL gagal disimpan.')
    try {
      if (uploadedPaths.length) {
        const context = await requireHarmonyApi(request)
        await context.admin.storage.from(BUCKET).remove(uploadedPaths)
      }
    } catch {
      // Cleanup best effort; error utama tetap dikembalikan.
    }
    return NextResponse.json(
      { success: false, error: normalized.message },
      { status: normalized.status },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await requireHarmonyApi(request)
    if (!context.employee) {
      return NextResponse.json({ success: false, error: 'Data employee tidak ditemukan.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const requestId = clean(body?.request_id)
    const note = clean(body?.note)
    if (!isUuid(requestId)) {
      return NextResponse.json({ success: false, error: 'ID pengajuan PHL tidak valid.' }, { status: 400 })
    }
    if (note.length < 3) {
      return NextResponse.json({ success: false, error: 'Alasan pembatalan minimal 3 karakter.' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await context.admin
      .from('phl_work_requests')
      .select('*')
      .eq('id', requestId)
      .eq('employee_id', context.employee.id)
      .maybeSingle()
    if (existingError) throw existingError
    if (!existing) return NextResponse.json({ success: false, error: 'Pengajuan PHL tidak ditemukan.' }, { status: 404 })
    if (existing.status !== 'pending_supervisor') {
      return NextResponse.json({ success: false, error: 'Hanya pengajuan yang masih menunggu atasan yang dapat dibatalkan.' }, { status: 409 })
    }

    const { data: cancelled, error: cancelError } = await context.admin
      .from('phl_work_requests')
      .update({
        status: 'cancelled',
        supervisor_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: context.employee.id,
        cancel_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'pending_supervisor')
      .select('*')
      .single()
    if (cancelError) throw cancelError

    const notification = await notifyPHLWorkCancelled(context.admin, cancelled).catch((error: any) => ({
      ok: false,
      message: error?.message || 'Email pembatalan gagal dikirim.',
    }))

    return NextResponse.json({ success: true, request: cancelled, notification })
  } catch (error) {
    const normalized = harmonyApiError(error, 'Pengajuan PHL gagal dibatalkan.')
    return NextResponse.json(
      { success: false, error: normalized.message },
      { status: normalized.status },
    )
  }
}
