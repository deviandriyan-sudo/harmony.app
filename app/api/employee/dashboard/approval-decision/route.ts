import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { harmonyApiError, requireHarmonyApi } from '@/lib/server/user-api-auth'
import { getPHLSubordinateIds } from '@/lib/server/phl-work'
import { deriveApprovalStage } from '@/lib/leave-workflow-status'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(request: NextRequest) {
  try {
    // JWT identity and active HARMONY binding validated before using admin reads.
    const auth = await requireHarmonyApi(request)
    if (!auth.employee || auth.employee.is_active === false) {
      return NextResponse.json({ error: 'Data atasan aktif tidak ditemukan.' }, { status: 403 })
    }
    const body = await request.json().catch(() => ({}))
    const id: unknown = body?.id
    const kind = String(body?.kind || '')
    const decision = String(body?.decision || '')
    const note = String(body?.note || '').trim()
    if (!isUuid(id) || !['leave', 'claim'].includes(kind) || !['approve', 'reject'].includes(decision)) {
      return NextResponse.json({ error: 'Keputusan approval tidak valid.' }, { status: 400 })
    }
    if (note.length > 2000 || (decision === 'reject' && note.length < 3)) {
      return NextResponse.json({ error: 'Alasan penolakan minimal 3 karakter; catatan maksimal 2000 karakter.' }, { status: 400 })
    }
    const table = kind === 'claim' ? 'phl_records' : 'leave_requests'
    const rowResult = await auth.admin.from(table)
      .select(kind === 'claim'
        ? 'id,employee_id,source,status,supervisor_status,hr_status'
        : 'id,employee_id,request_type,status,supervisor_status,hr_status')
      .eq('id', id).maybeSingle()
    if (rowResult.error) throw rowResult.error
    const row = rowResult.data as { id: string; employee_id: string; source?: string | null; request_type?: string | null; status?: string | null; supervisor_status?: string | null; hr_status?: string | null } | null
    if (!row) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 })
    if (row.employee_id === auth.employee.id) {
      return NextResponse.json({ error: 'Self-approval tidak diizinkan.' }, { status: 403 })
    }
    if (kind === 'claim' && row.source !== 'employee_phl_claim') {
      return NextResponse.json({ error: 'Record bukan klaim PHL employee.' }, { status: 409 })
    }
    if (kind === 'leave' && row.request_type === 'phl_claim') {
      return NextResponse.json({ error: 'Gunakan workflow klaim PHL.' }, { status: 409 })
    }
    if (deriveApprovalStage(row) !== 'waiting_supervisor') {
      return NextResponse.json({ error: 'Pengajuan tidak lagi berada pada tahap approval atasan. Muat ulang data.' }, { status: 409 })
    }
    const team = await getPHLSubordinateIds(auth.admin, auth.employee)
    if (!team.includes(row.employee_id)) {
      return NextResponse.json({ error: 'Pengajuan ini bukan milik bawahan yang berwenang.' }, { status: 403 })
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) throw new Error('Supabase publishable configuration missing')
    const bearer = request.headers.get('authorization') || ''
    // NEVER invoke supervisor SQL as service_role: SQL verifies auth.uid() and employee assignment.
    const scoped = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: bearer } },
    })
    const supervisorNote = note || 'Disetujui oleh atasan melalui Dashboard.'
    const result = kind === 'claim'
      ? await scoped.rpc('harmony_supervisor_review_phl_claim_v1', {
          p_claim_id: id, p_action: decision, p_note: supervisorNote,
        })
      : decision === 'approve'
        ? await scoped.rpc('approve_leave_request_by_supervisor', {
            p_request_id: id, p_supervisor_id: auth.employee.id,
            p_supervisor_name: auth.employee.full_name || auth.authEmail || 'Atasan',
            p_note: supervisorNote,
          })
        : await scoped.rpc('reject_leave_request_by_supervisor', {
            p_request_id: id, p_supervisor_id: auth.employee.id,
            p_supervisor_name: auth.employee.full_name || auth.authEmail || 'Atasan',
            p_note: supervisorNote,
          })
    if (result.error) {
      const detail = String(result.error.message || '')
      if (/saldo|saldo cuti|pengajuan|periode|atasan|approval|klaim|izin|akses|hutang/i.test(detail)) {
        return NextResponse.json({ error: detail.slice(0, 350) }, { status: 409 })
      }
      throw result.error
    }
    const reviewPayload = result.data && typeof result.data === 'object'
      ? result.data as {success?:boolean;message?:string} : null
    if (kind === 'claim' && reviewPayload?.success === false) {
      return NextResponse.json({ error: String(reviewPayload.message || 'Klaim PHL belum berhasil diproses.') }, { status: 409 })
    }
    return NextResponse.json({ success: true, message: kind === 'claim'
      ? String(reviewPayload?.message || 'Keputusan klaim PHL tersimpan.')
      : 'Keputusan pengajuan tersimpan.',
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const normalized = harmonyApiError(error, 'Keputusan approval gagal diproses.')
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
