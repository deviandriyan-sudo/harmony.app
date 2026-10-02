import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import {
  REMED_ALLOWED_MIME_TYPES,
  REMED_BUCKET,
  REMED_MAX_FILES,
  REMED_MAX_FILE_SIZE,
  safeFileName,
} from '@/lib/remed'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { enrichRemedClaims } from '@/lib/server/remed-data'

function normalizeFiles(formData: FormData) {
  return formData
    .getAll('receipts')
    .filter((value): value is File => value instanceof File && value.size > 0)
}

function validateFiles(files: File[]) {
  if (files.length < 1) throw Object.assign(new Error('Minimal 1 bukti kuitansi wajib diunggah.'), { status: 400 })
  if (files.length > REMED_MAX_FILES) throw Object.assign(new Error(`Maksimal ${REMED_MAX_FILES} file bukti.`), { status: 400 })
  for (const file of files) {
    if (file.size > REMED_MAX_FILE_SIZE) throw Object.assign(new Error(`File ${file.name} melebihi 10 MB.`), { status: 400 })
    if (!REMED_ALLOWED_MIME_TYPES.has(file.type)) throw Object.assign(new Error(`Format ${file.name} tidak didukung.`), { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')?.trim() || ''

    let query = ctx.admin.from('remed_claims').select('*').order('created_at', { ascending: false })

    if (ctx.access.role === 'employee') {
      if (!ctx.access.employee_id) throw Object.assign(new Error('Akun belum terhubung ke employee.'), { status: 409 })
      query = query.eq('employee_id', ctx.access.employee_id)
    }

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ claims: await enrichRemedClaims(ctx.admin, data || []) })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function POST(request: NextRequest) {
  const uploadedPaths: string[] = []
  let createdClaimId = ''

  try {
    const ctx = await requireRemedApi(request, ['employee'])
    if (!ctx.access.employee_id) throw Object.assign(new Error('Akun belum terhubung ke employee.'), { status: 409 })

    const formData = await request.formData()
    const files = normalizeFiles(formData)
    validateFiles(files)

    const claimTypeId = String(formData.get('claim_type_id') || '').trim()
    const treatmentDate = String(formData.get('treatment_date') || '').trim()
    const providerName = String(formData.get('provider_name') || '').trim()
    const employeeNote = String(formData.get('employee_note') || '').trim()
    const bankName = String(formData.get('bank_name') || '').trim()
    const bankAccountNumber = String(formData.get('bank_account_number') || '').trim()
    const bankAccountName = String(formData.get('bank_account_name') || '').trim()
    const amount = Number(formData.get('submitted_amount') || 0)

    if (!claimTypeId || !treatmentDate || !Number.isFinite(amount) || amount <= 0) {
      throw Object.assign(new Error('Jenis klaim, tanggal pengobatan, dan nominal wajib valid.'), { status: 400 })
    }
    if (!bankName || !bankAccountNumber || !bankAccountName) {
      throw Object.assign(new Error('Data rekening pembayaran wajib diisi.'), { status: 400 })
    }

    const { data: rpcData, error: rpcError } = await ctx.admin.rpc('remed_submit_claim_v1', {
      p_employee_id: ctx.access.employee_id,
      p_claim_type_id: claimTypeId,
      p_treatment_date: treatmentDate,
      p_provider_name: providerName || null,
      p_submitted_amount: amount,
      p_employee_note: employeeNote || null,
      p_bank_name: bankName,
      p_bank_account_number: bankAccountNumber,
      p_bank_account_name: bankAccountName,
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
    })
    if (rpcError) throw Object.assign(new Error(rpcError.message), { status: 400 })

    const result = Array.isArray(rpcData) ? rpcData[0] : rpcData
    createdClaimId = String(result?.claim_id || result?.id || '')
    const claimNumber = String(result?.claim_number || '')
    if (!createdClaimId) throw new Error('Claim berhasil dibuat tetapi ID tidak diterima dari database.')

    for (const [index, file] of files.entries()) {
      const extensionName = safeFileName(file.name)
      const storagePath = `claims/${ctx.access.employee_id}/${createdClaimId}/${String(index + 1).padStart(2, '0')}-${randomUUID()}-${extensionName}`
      const bytes = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await ctx.admin.storage
        .from(REMED_BUCKET)
        .upload(storagePath, bytes, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      uploadedPaths.push(storagePath)

      const { error: attachmentError } = await ctx.admin.from('remed_claim_attachments').insert({
        claim_id: createdClaimId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        attachment_kind: 'receipt',
        uploaded_by: ctx.authUserId,
      })
      if (attachmentError) throw attachmentError
    }

    await ctx.admin.rpc('remed_write_audit_v1', {
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
      p_actor_role: ctx.access.role,
      p_action: 'claim_receipts_uploaded',
      p_entity_type: 'remed_claim',
      p_entity_id: createdClaimId,
      p_metadata: { file_count: files.length },
    })

    return NextResponse.json({ claimId: createdClaimId, claimNumber }, { status: 201 })
  } catch (error) {
    try {
      if (uploadedPaths.length) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (url && key) {
          const { createClient } = await import('@supabase/supabase-js')
          const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
          await admin.storage.from(REMED_BUCKET).remove(uploadedPaths)
          if (createdClaimId) {
            await admin.from('remed_claim_attachments').delete().eq('claim_id', createdClaimId)
            await admin.rpc('remed_cancel_claim_v1', {
              p_claim_id: createdClaimId,
              p_actor_auth_user_id: null,
              p_actor_email: 'system@rollback',
              p_reason: 'Rollback otomatis karena upload bukti gagal.',
            })
          }
        }
      } else if (createdClaimId) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (url && key) {
          const { createClient } = await import('@supabase/supabase-js')
          const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
          await admin.rpc('remed_cancel_claim_v1', {
            p_claim_id: createdClaimId,
            p_actor_auth_user_id: null,
            p_actor_email: 'system@rollback',
            p_reason: 'Rollback otomatis karena proses lampiran gagal.',
          })
        }
      }
    } catch {
      // Best effort rollback. Primary error is returned below.
    }

    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
