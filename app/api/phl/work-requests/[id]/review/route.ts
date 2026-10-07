import { NextRequest, NextResponse } from 'next/server'

import { harmonyApiError, requireHarmonyApi } from '@/lib/server/user-api-auth'
import { isPHLSupervisorOf, notifyPHLWorkDecision } from '@/lib/server/phl-work'

export const runtime = 'nodejs'

function clean(value: unknown) {
  return String(value || '').trim()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
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

    const allowed = await isPHLSupervisorOf(auth.admin, auth.employee, target.employee_id)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Anda bukan atasan yang terhubung dengan employee ini.' },
        { status: 403 },
      )
    }

    const supervisorName = auth.employee.full_name || auth.authEmail || 'Atasan'
    const { data: result, error: reviewError } = await auth.admin.rpc(
      'harmony_review_phl_work_request_v1',
      {
        p_request_id: requestId,
        p_action: decision,
        p_supervisor_id: auth.employee.id,
        p_supervisor_name: supervisorName,
        p_supervisor_email: auth.employee.email || auth.authEmail || null,
        p_note: note || (decision === 'approve' ? 'Disetujui oleh atasan.' : 'Ditolak oleh atasan.'),
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

    const notification = await notifyPHLWorkDecision(reviewed).catch((error: any) => ({
      ok: false,
      message: error?.message || 'Email keputusan PHL gagal dikirim.',
    }))

    return NextResponse.json({
      success: true,
      request: reviewed,
      phl_record_id: rpcResult.phl_record_id || reviewed.credited_phl_record_id || null,
      message: rpcResult.message || 'Pengajuan PHL berhasil diproses.',
      notification,
    })
  } catch (error) {
    const normalized = harmonyApiError(error, 'Review pengajuan PHL gagal diproses.')
    return NextResponse.json(
      { success: false, error: normalized.message },
      { status: normalized.status },
    )
  }
}
