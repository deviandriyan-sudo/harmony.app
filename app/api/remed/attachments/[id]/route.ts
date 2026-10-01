import { NextRequest, NextResponse } from 'next/server'
import { REMED_BUCKET } from '@/lib/remed'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRemedApi(request)
    const { id } = await context.params

    const { data: attachment, error } = await ctx.admin
      .from('remed_claim_attachments')
      .select('id,claim_id,storage_path,file_name')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!attachment) throw Object.assign(new Error('Lampiran tidak ditemukan.'), { status: 404 })

    const { data: claim, error: claimError } = await ctx.admin
      .from('remed_claims')
      .select('id,employee_id')
      .eq('id', attachment.claim_id)
      .maybeSingle()
    if (claimError) throw claimError
    if (!claim) throw Object.assign(new Error('Klaim tidak ditemukan.'), { status: 404 })

    if (ctx.access.role === 'employee' && claim.employee_id !== ctx.access.employee_id) {
      throw Object.assign(new Error('Lampiran ini bukan milik akun Anda.'), { status: 403 })
    }

    const { data: signed, error: signedError } = await ctx.admin.storage
      .from(REMED_BUCKET)
      .createSignedUrl(attachment.storage_path, 60)
    if (signedError || !signed?.signedUrl) throw signedError || new Error('Gagal membuat akses lampiran.')

    return NextResponse.json({ url: signed.signedUrl, fileName: attachment.file_name })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
