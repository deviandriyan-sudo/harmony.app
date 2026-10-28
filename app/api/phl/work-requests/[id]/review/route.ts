import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { harmonyApiError, requireHarmonyApi } from '@/lib/server/user-api-auth'
import { isPHLSupervisorOf, notifyPHLWorkDecision } from '@/lib/server/phl-work'

export const runtime = 'nodejs'

const MIN_WORK_MINUTES = 240

type AttendanceSyncSnapshot = {
  id: string
  created: boolean
  previous?: Record<string, unknown>
}

function clean(value: unknown) {
  return String(value || '').trim()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function timeToMinutes(value: unknown) {
  const match = clean(value).match(/(\d{1,2}):(\d{2})/)
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
  if (difference === 0) return 0
  return difference > 0 ? difference : difference + 24 * 60
}

type PHLAttendanceRow = {
  work_duration_minutes?: number | null
  manual_check_in?: string | null
  requested_check_in?: string | null
  check_in?: string | null
  manual_check_out?: string | null
  requested_check_out?: string | null
  check_out?: string | null
}

type PHLWorkRequestRow = {
  id: string
  employee_id: string
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null
  attendance_log_id?: string | null
  work_date: string
  work_purpose?: string | null
  work_start_time?: string | null
  work_end_time?: string | null
  requested_work_minutes?: number | null
}

function attendanceDuration(row: PHLAttendanceRow | null) {
  const direct = Number(row?.work_duration_minutes || 0)
  const directMinutes = Number.isFinite(direct) && direct > 0 ? direct : 0
  const start = row?.manual_check_in || row?.requested_check_in || row?.check_in || null
  const end = row?.manual_check_out || row?.requested_check_out || row?.check_out || null
  return Math.max(directMinutes, durationBetween(start, end))
}

function appendNote(existing: unknown, next: string) {
  const current = clean(existing)
  return current ? `${current}\n${next}` : next
}

async function findAttendanceForApproval(admin: SupabaseClient, target: PHLWorkRequestRow) {
  if (target.attendance_log_id) {
    const byId = await admin
      .from('attendance_logs')
      .select('*')
      .eq('id', target.attendance_log_id)
      .maybeSingle()
    if (byId.error) throw byId.error
    if (byId.data) return byId.data
  }

  const identities: Array<[string, string]> = [
    ['employee_id', clean(target.employee_id)],
    ['employee_number', clean(target.employee_number)],
    ['machine_pin', clean(target.machine_pin)],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>

  for (const [column, value] of identities) {
    const result = await admin
      .from('attendance_logs')
      .select('*')
      .eq(column, value)
      .eq('attendance_date', target.work_date)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (result.error) throw result.error
    if (result.data) return result.data
  }

  return null
}

async function firstEvidenceName(admin: SupabaseClient, requestId: string) {
  const result = await admin
    .from('phl_work_request_attachments')
    .select('file_name')
    .eq('request_id', requestId)
    .order('slot_no')
    .limit(1)
    .maybeSingle()
  if (result.error) throw result.error
  return clean(result.data?.file_name) || null
}

async function syncApprovedPHLToAttendance(
  admin: SupabaseClient,
  target: PHLWorkRequestRow,
  supervisorName: string,
  supervisorEmail: string | null,
  supervisorNote: string,
) {
  const requestedMinutes = Number(target.requested_work_minutes || 0)
  if (!Number.isFinite(requestedMinutes) || requestedMinutes < MIN_WORK_MINUTES) {
    throw new Error('Durasi penugasan PHL minimal 4 jam sebelum dapat disetujui.')
  }

  const evidenceName = await firstEvidenceName(admin, target.id)
  if (!evidenceName) throw new Error('Evidence/Surat Tugas PHL tidak ditemukan.')

  const existing = await findAttendanceForApproval(admin, target)
  const now = new Date().toISOString()
  const workflowNote = `[PHL ${target.id}] ${clean(target.work_purpose)}`

  if (existing) {
    if (existing.phl_work_request_id && clean(existing.phl_work_request_id) !== clean(target.id)) {
      throw new Error('Tanggal tersebut sudah terhubung ke pengajuan PHL lain.')
    }

    const actualMinutes = attendanceDuration(existing)
    const needsManualSync = actualMinutes < MIN_WORK_MINUTES
    const previous = {
      manual_check_in: existing.manual_check_in ?? null,
      manual_check_out: existing.manual_check_out ?? null,
      requested_check_in: existing.requested_check_in ?? null,
      requested_check_out: existing.requested_check_out ?? null,
      work_duration_minutes: existing.work_duration_minutes ?? null,
      status: existing.status ?? null,
      source: existing.source ?? null,
      notes: existing.notes ?? null,
      employee_daily_note: existing.employee_daily_note ?? null,
      is_phl_candidate: existing.is_phl_candidate ?? false,
      phl_work_request_id: existing.phl_work_request_id ?? null,
      phl_proof_name: existing.phl_proof_name ?? null,
      updated_at: existing.updated_at ?? null,
    }

    const updatePayload: Record<string, unknown> = {
      is_phl_candidate: true,
      phl_work_request_id: target.id,
      phl_proof_name: evidenceName,
      employee_daily_note: appendNote(existing.employee_daily_note, workflowNote),
      notes: appendNote(existing.notes, 'PHL disetujui atasan dan ditautkan otomatis ke absensi.'),
      updated_at: now,
    }

    if (needsManualSync) {
      updatePayload.manual_check_in = target.work_start_time
      updatePayload.manual_check_out = target.work_end_time
      updatePayload.requested_check_in = target.work_start_time
      updatePayload.requested_check_out = target.work_end_time
      updatePayload.work_duration_minutes = requestedMinutes
      if (!existing.check_in && !existing.check_out) {
        updatePayload.status = 'present'
        updatePayload.source = 'employee_live_manual'
      }
    }

    const updated = await admin
      .from('attendance_logs')
      .update(updatePayload)
      .eq('id', existing.id)
      .select('id')
      .single()
    if (updated.error) throw updated.error

    return {
      attendanceLogId: updated.data.id,
      recordedMinutes: needsManualSync ? requestedMinutes : actualMinutes,
      snapshot: { id: updated.data.id, created: false, previous } as AttendanceSyncSnapshot,
    }
  }

  const inserted = await admin
    .from('attendance_logs')
    .insert({
      employee_id: target.employee_id,
      employee_number: target.employee_number || null,
      machine_pin: target.machine_pin || null,
      full_name: target.full_name || null,
      department: target.department || null,
      position: target.position || null,
      attendance_date: target.work_date,
      upload_id: null,
      check_in: null,
      check_out: null,
      manual_check_in: target.work_start_time,
      manual_check_out: target.work_end_time,
      requested_check_in: target.work_start_time,
      requested_check_out: target.work_end_time,
      total_punches: 0,
      work_duration_minutes: requestedMinutes,
      status: 'present',
      source: 'employee_live_manual',
      employee_daily_note: workflowNote,
      notes: 'Absensi dibuat otomatis dari Pengajuan Saldo PHL yang disetujui atasan.',
      supervisor_approval_status: 'approved',
      supervisor_approved_by: supervisorName,
      supervisor_approved_at: now,
      supervisor_reviewed_by: supervisorName,
      supervisor_reviewed_at: now,
      supervisor_note: supervisorNote || 'Disetujui melalui workflow Saldo PHL.',
      is_phl_candidate: true,
      phl_proof_name: evidenceName,
      phl_work_request_id: target.id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      deleted_by: null,
    })
    .select('id')
    .single()

  if (inserted.error) throw inserted.error

  return {
    attendanceLogId: inserted.data.id,
    recordedMinutes: requestedMinutes,
    snapshot: { id: inserted.data.id, created: true } as AttendanceSyncSnapshot,
  }
}

async function rollbackAttendanceSync(admin: SupabaseClient, snapshot: AttendanceSyncSnapshot | null) {
  if (!snapshot) return
  if (snapshot.created) {
    await admin.from('attendance_logs').delete().eq('id', snapshot.id)
    return
  }
  if (snapshot.previous) {
    await admin.from('attendance_logs').update(snapshot.previous).eq('id', snapshot.id)
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireHarmonyApi(request)
    if (!auth.employee) {
      return NextResponse.json(
        { success: false, error: 'Data employee atasan tidak ditemukan.' },
        { status: 403 },
      )
    }

    const { id } = await context.params
    const requestId = clean(id)
    if (!isUuid(requestId)) {
      return NextResponse.json({ success: false, error: 'ID pengajuan PHL tidak valid.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const decision = clean(body?.decision).toLowerCase()
    const note = clean(body?.note)
    if (!['approve', 'reject'].includes(decision)) {
      return NextResponse.json({ success: false, error: 'Keputusan approval tidak valid.' }, { status: 400 })
    }
    if (decision === 'reject' && note.length < 3) {
      return NextResponse.json({ success: false, error: 'Alasan penolakan minimal 3 karakter.' }, { status: 400 })
    }

    const { data: target, error: targetError } = await auth.admin
      .from('phl_work_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()
    if (targetError) throw targetError
    if (!target) return NextResponse.json({ success: false, error: 'Pengajuan PHL tidak ditemukan.' }, { status: 404 })
    if (clean(target.status) !== 'pending_supervisor') {
      return NextResponse.json(
        { success: false, error: 'Pengajuan PHL ini sudah diproses. Refresh halaman untuk melihat status terbaru.' },
        { status: 409 },
      )
    }

    const allowed = await isPHLSupervisorOf(auth.admin, auth.employee, target.employee_id)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Anda bukan atasan yang terhubung dengan employee ini.' },
        { status: 403 },
      )
    }

    const supervisorName = auth.employee.full_name || auth.authEmail || 'Atasan'
    const supervisorEmail = auth.employee.email || auth.authEmail || null
    const supervisorNote = note || (decision === 'approve' ? 'Disetujui oleh atasan.' : 'Ditolak oleh atasan.')

    let attendanceSnapshot: AttendanceSyncSnapshot | null = null
    const workRequestSnapshot = {
      attendance_log_id: target.attendance_log_id ?? null,
      attendance_verified: Boolean(target.attendance_verified),
      recorded_work_minutes: target.recorded_work_minutes,
      updated_at: target.updated_at,
    }

    try {
      if (decision === 'approve' && (!target.attendance_log_id || !target.attendance_verified || Number(target.recorded_work_minutes || 0) < MIN_WORK_MINUTES)) {
        const synced = await syncApprovedPHLToAttendance(
          auth.admin,
          target,
          supervisorName,
          supervisorEmail,
          supervisorNote,
        )
        attendanceSnapshot = synced.snapshot

        const prepared = await auth.admin
          .from('phl_work_requests')
          .update({
            attendance_log_id: synced.attendanceLogId,
            attendance_verified: true,
            recorded_work_minutes: synced.recordedMinutes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', requestId)
          .eq('status', 'pending_supervisor')
          .select('id')
          .single()
        if (prepared.error) throw prepared.error
      }

      const { data: result, error: reviewError } = await auth.admin.rpc(
        'harmony_review_phl_work_request_v1',
        {
          p_request_id: requestId,
          p_action: decision,
          p_supervisor_id: auth.employee.id,
          p_supervisor_name: supervisorName,
          p_supervisor_email: supervisorEmail,
          p_note: supervisorNote,
        },
      )

      if (reviewError) throw reviewError

      const rpcResult = (result || {}) as {
        success?: boolean
        request_id?: string
        phl_record_id?: string | null
        message?: string
      }
      if (!rpcResult.success) {
        if (attendanceSnapshot) {
          await auth.admin.from('phl_work_requests').update(workRequestSnapshot).eq('id', requestId)
          await rollbackAttendanceSync(auth.admin, attendanceSnapshot)
        }
        return NextResponse.json(
          { success: false, error: rpcResult.message || 'Pengajuan PHL belum berhasil diproses.' },
          { status: 409 },
        )
      }

      const { data: reviewed, error: reviewedError } = await auth.admin
        .from('phl_work_requests')
        .select('*')
        .eq('id', requestId)
        .single()
      if (reviewedError) throw reviewedError

      const notification = await notifyPHLWorkDecision(reviewed).catch((error: unknown) => ({
        ok: false,
        message: (error instanceof Error ? error.message : '') || 'Email keputusan PHL gagal dikirim.',
      }))

      return NextResponse.json({
        success: true,
        request: reviewed,
        phl_record_id: rpcResult.phl_record_id || reviewed.credited_phl_record_id || null,
        message: rpcResult.message || 'Pengajuan PHL berhasil diproses.',
        notification,
      })
    } catch (processingError) {
      if (attendanceSnapshot) {
        await auth.admin.from('phl_work_requests').update(workRequestSnapshot).eq('id', requestId)
        await rollbackAttendanceSync(auth.admin, attendanceSnapshot)
      }
      throw processingError
    }
  } catch (error) {
    const normalized = harmonyApiError(error, 'Review pengajuan PHL gagal diproses.')
    return NextResponse.json(
      { success: false, error: normalized.message },
      { status: normalized.status },
    )
  }
}
