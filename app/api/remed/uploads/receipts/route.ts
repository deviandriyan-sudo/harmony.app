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

type ReceiptInput = {
  name?: string
  mimeType?: string
  size?: number
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

function normalizeReceiptInputs(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    const row = (item || {}) as ReceiptInput
    const name = String(row.name || '').trim()
    const size = Number(row.size || 0)
    const mimeType = inferredMimeType(name, String(row.mimeType || ''))
    return { name, size, mimeType }
  })
}

function validateReceiptInputs(files: ReturnType<typeof normalizeReceiptInputs>) {
  if (files.length < 1) throw Object.assign(new Error('Minimal 1 bukti kuitansi wajib dipilih.'), { status: 400 })
  if (files.length > REMED_MAX_FILES) throw Object.assign(new Error(`Maksimal ${REMED_MAX_FILES} file bukti.`), { status: 400 })

  for (const file of files) {
    if (!file.name || !Number.isFinite(file.size) || file.size <= 0) {
      throw Object.assign(new Error('Metadata file bukti tidak valid.'), { status: 400 })
    }
    if (file.size > REMED_MAX_FILE_SIZE) {
      throw Object.assign(new Error(`File ${file.name} melebihi 10 MB.`), { status: 400 })
    }
    if (!REMED_ALLOWED_MIME_TYPES.has(file.mimeType)) {
      throw Object.assign(new Error(`Format ${file.name} tidak didukung. Gunakan PDF/JPG/PNG/WEBP.`), { status: 400 })
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['employee'])
    if (!ctx.access.employee_id) throw Object.assign(new Error('Akun belum terhubung ke employee.'), { status: 409 })

    const body = await request.json().catch(() => ({}))
    const files = normalizeReceiptInputs(body?.files)
    validateReceiptInputs(files)

    const tickets = []
    for (const file of files) {
      const storagePath = `_staging/claims/${ctx.access.employee_id}/${randomUUID()}-${safeFileName(file.name)}`
      const { data, error } = await ctx.admin.storage.from(REMED_BUCKET).createSignedUploadUrl(storagePath, { upsert: false })
      if (error || !data?.token) throw error || new Error('Gagal membuat upload ticket untuk kuitansi.')

      tickets.push({
        path: storagePath,
        token: data.token,
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: file.size,
      })
    }

    return NextResponse.json({ tickets })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['employee'])
    if (!ctx.access.employee_id) throw Object.assign(new Error('Akun belum terhubung ke employee.'), { status: 409 })

    const body = await request.json().catch(() => ({}))
    const paths = Array.isArray(body?.paths) ? body.paths.map((value: unknown) => String(value || '').trim()).filter(Boolean) : []
    const prefix = `_staging/claims/${ctx.access.employee_id}/`
    const safePaths = paths.filter((path: string) => path.startsWith(prefix)).slice(0, REMED_MAX_FILES)

    if (safePaths.length) {
      const { error } = await ctx.admin.storage.from(REMED_BUCKET).remove(safePaths)
      if (error) throw error
    }

    return NextResponse.json({ removed: safePaths.length })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
