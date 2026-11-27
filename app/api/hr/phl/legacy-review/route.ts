import { NextRequest, NextResponse } from 'next/server'
import { harmonyApiError, normalizeHarmonyRole, requireHarmonyApi } from '@/lib/server/user-api-auth'
import { phlWorkApprovalExpired } from '@/lib/phl-work-expiry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HR_ROLES = new Set(['hr', 'admin', 'administrator', 'super_admin', 'human_resources'])
function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireHarmonyApi(request)
    if (!HR_ROLES.has(normalizeHarmonyRole(auth.appUser.role))) {
      return NextResponse.json({ error: 'Hanya HR berwenang memvalidasi PHL migrasi historis.' }, { status: 403 })
    }
    const body = await request.json().catch(() => ({}))
    const id: unknown = body?.id
    const outcome: unknown = body?.outcome
    const note = String(body?.note || '').trim()
    if (!isUuid(id) || !['validated_historical', 'rejected_historical'].includes(String(outcome))) {
      return NextResponse.json({ error: 'Keputusan historis HR tidak valid.' }, { status: 400 })
    }
    if (note.length < 10 || note.length > 2000) {
      return NextResponse.json({ error: 'Catatan HR wajib 10–2000 karakter.' }, { status: 400 })
    }

    // Independent verification before the atomic SQL RPC; no supervisor approval
    // or balance mutation is allowed through this historical endpoint.
    const found = await auth.admin.from('phl_work_requests')
      .select('id,employee_id,work_date,status,origin,credited_phl_record_id')
      .eq('id', id).maybeSingle()
    if (found.error) throw found.error
    if (!found.data) return NextResponse.json({ error: 'PHL tidak ditemukan.' }, { status: 404 })
    const row = found.data
    if (row.status !== 'pending_supervisor' || row.origin !== 'legacy_attendance' ||
        !phlWorkApprovalExpired(row.work_date) || row.credited_phl_record_id) {
      return NextResponse.json({ error: 'Record tidak memenuhi kriteria validasi PHL migrasi yang kedaluwarsa.' }, { status: 409 })
    }

    // Only service-role can EXECUTE; transaction, uniqueness and row lock are
    // enforced in the SQL RPC. HR identity is derived exclusively from JWT.
    const result = await auth.admin.rpc('harmony_hr_resolve_expired_legacy_phl_rc3g', {
      p_request_id: id,
      p_outcome: outcome,
      p_note: note,
      p_reviewer_user_id: auth.authUserId,
      p_reviewer_email: auth.authEmail || auth.appUser.email,
    })
    if (result.error) {
      // Missing migration is a deployment dependency, not a reason to bypass checks.
      if (result.error.code === 'PGRST202' || result.error.code === '42883') {
        return NextResponse.json({ error: 'Migration SQL RC3G belum diaktifkan. Hubungi administrator.' }, { status: 503 })
      }
      if (result.error.code === 'P0001' || result.error.code === '23505') {
        return NextResponse.json({ error: 'Record telah berubah atau tidak memenuhi syarat. Refresh dan periksa histori PHL.' }, { status: 409 })
      }
      throw result.error
    }
    return NextResponse.json(result.data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const normalized = harmonyApiError(error, 'Validasi historis HR gagal diproses.')
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
