import { supabase } from '@/lib/supabase'

export type HarmonyAttachmentEntityType =
  | 'leave_request'
  | 'phl_record'
  | 'attendance_log'
  | 'leave_postpone'

export type HarmonyAttachment = {
  id: string
  entity_type: HarmonyAttachmentEntityType
  entity_id: string
  owner_employee_id: string | null
  slot_no: number
  attachment_kind: string
  file_url: string
  file_name: string
  file_size: number | null
  file_type: string | null
  storage_bucket: string
  storage_path: string | null
  is_legacy: boolean
  created_at: string
}

export type LegacyAttachmentLink = {
  url: string | null | undefined
  name?: string | null | undefined
  size?: number | null | undefined
  type?: string | null | undefined
  storagePath?: string | null | undefined
}

export const HARMONY_ATTACHMENT_MAX_FILES = 3
export const HARMONY_ATTACHMENT_MAX_FILE_BYTES = 10 * 1024 * 1024
export const HARMONY_ATTACHMENT_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx'

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
  'xls',
  'xlsx',
])

export function formatHarmonyAttachmentSize(size: number | null | undefined) {
  const value = Number(size || 0)
  if (!value) return ''
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function validateHarmonyAttachmentFile(file: File) {
  const extension = String(file.name || '')
    .split('.')
    .pop()
    ?.toLowerCase()

  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return 'Format file tidak didukung. Gunakan PDF, JPG, PNG, WEBP, DOC/DOCX, atau XLS/XLSX.'
  }

  if (file.size > HARMONY_ATTACHMENT_MAX_FILE_BYTES) {
    return `Ukuran ${file.name} melebihi 10 MB.`
  }

  return ''
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    throw new Error('Session login tidak valid. Silakan login ulang.')
  }

  return data.session.access_token
}

export async function listHarmonyAttachments(
  entityType: HarmonyAttachmentEntityType,
  entityId: string,
) {
  if (!entityId) return [] as HarmonyAttachment[]

  const token = await getAccessToken()
  const query = new URLSearchParams({
    entity_type: entityType,
    entity_id: entityId,
  })

  const response = await fetch(`/api/attachments?${query.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || result?.success === false) {
    throw new Error(result?.error || 'Lampiran gagal dimuat.')
  }

  return (result?.attachments || []) as HarmonyAttachment[]
}

export async function registerHarmonySubmissionAttachments({
  entityType,
  entityId,
  legacy,
  extraFiles,
  attachmentKind = 'supporting_document',
}: {
  entityType: HarmonyAttachmentEntityType
  entityId: string
  legacy?: LegacyAttachmentLink | null
  extraFiles?: File[]
  attachmentKind?: string
}) {
  const normalizedExtraFiles = (extraFiles || []).filter(Boolean)
  const hasLegacy = Boolean(String(legacy?.url || '').trim())

  if (!hasLegacy && normalizedExtraFiles.length === 0) {
    return {
      success: true,
      attachments: [] as HarmonyAttachment[],
      message: 'Tidak ada lampiran untuk diregistrasikan.',
    }
  }

  const token = await getAccessToken()
  const body = new FormData()

  body.append('entity_type', entityType)
  body.append('entity_id', entityId)
  body.append('attachment_kind', attachmentKind)

  if (hasLegacy && legacy) {
    body.append('legacy_url', String(legacy.url || '').trim())
    body.append('legacy_name', String(legacy.name || 'Dokumen Pendukung'))
    body.append('legacy_size', String(Number(legacy.size || 0)))
    body.append('legacy_type', String(legacy.type || ''))
    body.append('legacy_storage_path', String(legacy.storagePath || ''))
  }

  for (const file of normalizedExtraFiles) {
    const validation = validateHarmonyAttachmentFile(file)
    if (validation) throw new Error(validation)
    body.append('files', file)
  }

  const response = await fetch('/api/attachments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || result?.success === false) {
    throw new Error(result?.error || 'Lampiran gagal diregistrasikan.')
  }

  return {
    success: true,
    attachments: (result?.attachments || []) as HarmonyAttachment[],
    message: String(result?.message || 'Lampiran berhasil disimpan.'),
  }
}

export async function addHarmonyAttendanceDraftAttachments({
  entityId,
  files,
  attachmentKind = 'attendance_support',
}: {
  entityId: string
  files: File[]
  attachmentKind?: string
}) {
  return registerHarmonySubmissionAttachments({
    entityType: 'attendance_log',
    entityId,
    extraFiles: files,
    attachmentKind,
  })
}

export async function deleteHarmonyAttachment(attachmentId: string) {
  const token = await getAccessToken()

  const response = await fetch('/api/attachments', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ attachment_id: attachmentId }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || result?.success === false) {
    throw new Error(result?.error || 'Lampiran gagal dihapus.')
  }

  return result
}
