import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { REMED_ALLOWED_MIME_TYPES, REMED_BUCKET, REMED_MAX_FILE_SIZE, safeFileName } from '@/lib/remed'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let uploadedPath = ''
  try {
    const ctx = await requireRemedApi(request, ['finance'])
    const { id } = await context.params
    const formData = await request.formData()
    const file = formData.get('payment_proof')
    const paymentDate = String(formData.get('payment_date') || '').trim()
    const paymentReference = String(formData.get('payment_reference') || '').trim()
    const note = String(formData.get('finance_note') || '').trim()

    if (!(file instanceof File) || file.size <= 0) {
      throw Object.assign(new Error('Bukti pembayaran wajib diunggah.'), { status: 400 })
    }
    if (!paymentDate) throw Object.assign(new Error('Tanggal pembayaran wajib diisi.'), { status: 400 })
    if (file.size > REMED_MAX_FILE_SIZE) throw Object.assign(new Error('Bukti pembayaran maksimal 10 MB.'), { status: 400 })
    if (!REMED_ALLOWED_MIME_TYPES.has(file.type)) throw Object.assign(new Error('Format bukti pembayaran tidak didukung.'), { status: 400 })

    uploadedPath = `payments/${id}/${randomUUID()}-${safeFileName(file.name)}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await ctx.admin.storage
      .from(REMED_BUCKET)
      .upload(uploadedPath, bytes, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError

    const { data: attachment, error: attachmentError } = await ctx.admin
      .from('remed_claim_attachments')
      .insert({
        claim_id: id,
        storage_path: uploadedPath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        attachment_kind: 'payment_proof',
        uploaded_by: ctx.authUserId,
      })
      .select('id')
      .single()
    if (attachmentError) throw attachmentError

    const { error: rpcError } = await ctx.admin.rpc('remed_mark_claim_paid_v1', {
      p_claim_id: id,
      p_payment_date: paymentDate,
      p_payment_reference: paymentReference || null,
      p_payment_proof_path: uploadedPath,
      p_note: note || null,
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
    })
    if (rpcError) {
      await ctx.admin.from('remed_claim_attachments').delete().eq('id', attachment.id)
      throw Object.assign(new Error(rpcError.message), { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (uploadedPath) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (url && key) {
          const { createClient } = await import('@supabase/supabase-js')
          const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
          await admin.storage.from(REMED_BUCKET).remove([uploadedPath])
        }
      } catch {
        // best effort cleanup
      }
    }
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
