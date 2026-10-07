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
import { notifyRemedClaimSubmitted } from '@/lib/server/workflow-notifications'

type StagedReceipt = {
  path: string
  fileName: string
  mimeType: string
  fileSize: number
}

function inferredMimeType(name: string, mimeType: string) {
  const current = mimeType.trim().toLowerCase()
  if (REMED_ALLOWED_MIME_TYPES.has(current)) return current

  const extension = name.split('.').pop()?.toLowerCase() || ''
  if (extension === 'pdf') return 'application/pdf'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  return current
}

function normalizeFiles(formData: FormData) {
  return formData
    .getAll('receipts')
    .filter((value): value is File => value instanceof File && value.size > 0)
}

function validateFiles(files: File[]) {
  if (files.length > REMED_MAX_FILES) throw Object.assign(new Error(`Maksimal ${REMED_MAX_FILES} file bukti.`), { status: 400 })
  for (const file of files) {
    const mimeType = inferredMimeType(file.name, file.type)
    if (file.size > REMED_MAX_FILE_SIZE) throw Object.assign(new Error(`File ${file.name} melebihi 10 MB.`), { status: 400 })
    if (!REMED_ALLOWED_MIME_TYPES.has(mimeType)) throw Object.assign(new Error(`Format ${file.name} tidak didukung.`), { status: 400 })
  }
}

function parseStagedReceipts(formData: FormData, employeeId: string) {
  const raw = String(formData.get('staged_receipts') || '').trim()
  if (!raw) return [] as StagedReceipt[]

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw Object.assign(new Error('Metadata upload kuitansi tidak valid.'), { status: 400 })
  }

  if (!Array.isArray(parsed)) throw Object.assign(new Error('Metadata upload kuitansi tidak valid.'), { status: 400 })
  if (parsed.length > REMED_MAX_FILES) throw Object.assign(new Error(`Maksimal ${REMED_MAX_FILES} file bukti.`), { status: 400 })

  const prefix = `_staging/claims/${employeeId}/`
  return parsed.map((item) => {
    const row = (item || {}) as Partial<StagedReceipt>
    const path = String(row.path || '').trim()
    const fileName = String(row.fileName || '').trim()
    const fileSize = Number(row.fileSize || 0)
    const mimeType = inferredMimeType(fileName, String(row.mimeType || ''))

    if (!path.startsWith(prefix) || !fileName || !Number.isFinite(fileSize) || fileSize <= 0) {
      throw Object.assign(new Error('Metadata upload kuitansi tidak sesuai dengan employee aktif.'), { status: 400 })
    }
    if (fileSize > REMED_MAX_FILE_SIZE) throw Object.assign(new Error(`File ${fileName} melebihi 10 MB.`), { status: 400 })
    if (!REMED_ALLOWED_MIME_TYPES.has(mimeType)) throw Object.assign(new Error(`Format ${fileName} tidak didukung.`), { status: 400 })

    return { path, fileName, fileSize, mimeType }
  })
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
  const stagedPaths = new Set<string>()
  let createdClaimId = ''

  try {
    const ctx = await requireRemedApi(request, ['employee'])
    if (!ctx.access.employee_id) throw Object.assign(new Error('Akun belum terhubung ke employee.'), { status: 409 })

    const formData = await request.formData()
    const files = normalizeFiles(formData)
    validateFiles(files)
    const stagedReceipts = parseStagedReceipts(formData, ctx.access.employee_id)
    stagedReceipts.forEach((receipt) => stagedPaths.add(receipt.path))

    const receiptCount = files.length + stagedReceipts.length
    if (receiptCount < 1) throw Object.assign(new Error('Minimal 1 bukti kuitansi wajib diunggah.'), { status: 400 })
    if (receiptCount > REMED_MAX_FILES) throw Object.assign(new Error(`Maksimal ${REMED_MAX_FILES} file bukti.`), { status: 400 })

    const claimTypeId = String(formData.get('claim_type_id') || '').trim()
    const treatmentDate = String(formData.get('treatment_date') || '').trim()
    const providerName = String(formData.get('provider_name') || '').trim()
    const employeeNote = String(formData.get('employee_note') || '').trim()
    const masterAccountNumber = String(ctx.employee?.sinarmas_account_number || '').trim()
    const masterAccountName = String(ctx.employee?.sinarmas_account_name || '').trim()
    const bankName = masterAccountNumber ? 'Bank Sinarmas' : (String(formData.get('bank_name') || 'Bank Sinarmas').trim() || 'Bank Sinarmas')
    const bankAccountNumber = masterAccountNumber || String(formData.get('bank_account_number') || '').trim()
    const bankAccountName = masterAccountName || String(formData.get('bank_account_name') || '').trim()
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

    let attachmentIndex = 0

    for (const receipt of stagedReceipts) {
      attachmentIndex += 1
      const finalPath = `claims/${ctx.access.employee_id}/${createdClaimId}/${String(attachmentIndex).padStart(2, '0')}-${randomUUID()}-${safeFileName(receipt.fileName)}`
      const { error: moveError } = await ctx.admin.storage.from(REMED_BUCKET).move(receipt.path, finalPath)
      if (moveError) throw moveError
      stagedPaths.delete(receipt.path)
      uploadedPaths.push(finalPath)

      const { error: attachmentError } = await ctx.admin.from('remed_claim_attachments').insert({
        claim_id: createdClaimId,
        storage_path: finalPath,
        file_name: receipt.fileName,
        mime_type: receipt.mimeType,
        file_size: receipt.fileSize,
        attachment_kind: 'receipt',
        uploaded_by: ctx.authUserId,
      })
      if (attachmentError) throw attachmentError
    }

    for (const file of files) {
      attachmentIndex += 1
      const mimeType = inferredMimeType(file.name, file.type)
      const storagePath = `claims/${ctx.access.employee_id}/${createdClaimId}/${String(attachmentIndex).padStart(2, '0')}-${randomUUID()}-${safeFileName(file.name)}`
      const bytes = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await ctx.admin.storage
        .from(REMED_BUCKET)
        .upload(storagePath, bytes, { contentType: mimeType, upsert: false })
      if (uploadError) throw uploadError
      uploadedPaths.push(storagePath)

      const { error: attachmentError } = await ctx.admin.from('remed_claim_attachments').insert({
        claim_id: createdClaimId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: mimeType,
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
      p_metadata: { file_count: receiptCount, upload_mode: stagedReceipts.length ? 'signed-direct' : 'server-multipart' },
    })

    let notification = null
    try {
      notification = await notifyRemedClaimSubmitted(ctx.admin, createdClaimId)
    } catch (notificationError: any) {
      notification = {
        ok: false,
        sent: 0,
        failed: 1,
        message: notificationError?.message || 'Notifikasi email Re-Med gagal diproses.',
      }
      console.warn('Re-Med submit email notification warning:', notificationError)
    }

    return NextResponse.json({ claimId: createdClaimId, claimNumber, notification }, { status: 201 })
  } catch (error) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (url && key) {
        const { createClient } = await import('@supabase/supabase-js')
        const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

        const cleanupPaths = [...uploadedPaths, ...stagedPaths]
        if (cleanupPaths.length) await admin.storage.from(REMED_BUCKET).remove(cleanupPaths)

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
    } catch {
      // Best effort rollback. Primary error is returned below.
    }

    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
