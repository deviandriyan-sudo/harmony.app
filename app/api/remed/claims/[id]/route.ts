import { NextRequest, NextResponse } from 'next/server'
import { REMED_BUCKET } from '@/lib/remed'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { enrichRemedClaims } from '@/lib/server/remed-data'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRemedApi(request)
    const { id } = await context.params

    const { data, error } = await ctx.admin
      .from('remed_claims')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) throw Object.assign(new Error('Klaim tidak ditemukan.'), { status: 404 })

    if (ctx.access.role === 'employee' && data.employee_id !== ctx.access.employee_id) {
      throw Object.assign(new Error('Anda tidak memiliki akses ke klaim ini.'), { status: 403 })
    }

    const claims = await enrichRemedClaims(ctx.admin, [data])
    return NextResponse.json({ claim: claims[0] })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRemedApi(request, ['hr', 'finance'])
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const reason = String(body?.reason || '').trim()

    if (!reason) {
      throw Object.assign(new Error('Alasan penghapusan wajib diisi.'), { status: 400 })
    }

    const { data, error } = await ctx.admin.rpc('remed_delete_claim_v2', {
      p_claim_id: id,
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
      p_reason: reason,
    })
    if (error) throw Object.assign(new Error(error.message), { status: 400 })

    const storagePaths = Array.isArray(data?.storage_paths)
      ? data.storage_paths.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
      : []

    let storageWarning: string | null = null
    if (storagePaths.length) {
      const { error: storageError } = await ctx.admin.storage.from(REMED_BUCKET).remove(storagePaths)
      if (storageError) storageWarning = 'Data klaim terhapus, tetapi sebagian file Storage perlu dibersihkan manual.'
    }

    return NextResponse.json({ success: true, result: data, warning: storageWarning })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
