import { NextRequest, NextResponse } from 'next/server'
import { REMED_BUCKET } from '@/lib/remed'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function DELETE(request: NextRequest, context: { params: Promise<{ claimId: string }> }) {
  try {
    const ctx = await requireRemedApi(request, ['hr'])
    const { claimId } = await context.params
    const body = await request.json().catch(() => ({}))
    const reason = String(body?.reason || '').trim()

    if (!reason) {
      throw Object.assign(new Error('Alasan penghapusan riwayat wajib diisi.'), { status: 400 })
    }

    const { data, error } = await ctx.admin.rpc('remed_purge_deleted_claim_history_v3', {
      p_claim_id: claimId,
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
      if (storageError) storageWarning = 'Riwayat terhapus, tetapi sebagian file Storage lama perlu dibersihkan manual.'
    }

    return NextResponse.json({ success: true, result: data, warning: storageWarning })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
